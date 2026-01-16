import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// CORS headers - allow production domain and localhost for development
const getAllowedOrigin = (requestOrigin: string | null): string => {
  const allowedOrigins = [
    "https://whistle-connect-hub.lovable.app",
    "https://id-preview--856f8f4a-52f9-4355-8af6-22a21abcc85e.lovable.app",
    "http://localhost:5173",
    "http://localhost:8080",
  ];
  
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  // Default to production for requests without origin
  return "https://whistle-connect-hub.lovable.app";
};

const getCorsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
});

serve(async (req) => {
  const requestOrigin = req.headers.get("origin");
  const allowedOrigin = getAllowedOrigin(requestOrigin);
  const corsHeaders = getCorsHeaders(allowedOrigin);
  
  console.log("[create-boost-checkout] Request received");
  console.log("[create-boost-checkout] Method:", req.method);
  console.log("[create-boost-checkout] Origin:", requestOrigin);
  console.log("[create-boost-checkout] Allowed origin:", allowedOrigin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("[create-boost-checkout] Handling OPTIONS preflight");
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  // Use anon client for auth verification
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  // Use service role client for DB operations (bypasses RLS)
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[create-boost-checkout] No authorization header");
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { 
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error("[create-boost-checkout] Auth failed:", authError);
      return new Response(
        JSON.stringify({ error: "Authentication failed", details: authError?.message }),
        { 
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("[create-boost-checkout] User authenticated:", user.id);

    const { post_id, amount_cents, message, is_public } = await req.json();
    console.log("[create-boost-checkout] Request body:", { post_id, amount_cents, message, is_public });

    if (!post_id || !amount_cents || amount_cents < 100) {
      return new Response(
        JSON.stringify({ error: "Invalid request: post_id and amount_cents (min 100) required" }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Verify post exists using service client (bypasses RLS)
    const { data: post, error: postError } = await serviceClient
      .from("posts")
      .select("id, title")
      .eq("id", post_id)
      .single();

    if (postError) {
      console.error("[create-boost-checkout] Post query error:", postError);
      return new Response(
        JSON.stringify({ error: `Post not found: ${postError.message}` }),
        { 
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (!post) {
      console.error("[create-boost-checkout] Post not found for id:", post_id);
      return new Response(
        JSON.stringify({ error: "Post not found" }),
        { 
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("[create-boost-checkout] Post found:", post.title);

    // Create pending boost record
    const { data: boost, error: boostError } = await serviceClient
      .from("post_boosts")
      .insert({
        post_id,
        from_user_id: user.id,
        amount_cents,
        currency: "eur",
        message: message || null,
        is_public: is_public ?? false,
        status: "pending",
      })
      .select()
      .single();

    if (boostError) {
      console.error("[create-boost-checkout] Boost insert error:", boostError);
      return new Response(
        JSON.stringify({ error: "Failed to create boost record", details: boostError.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("[create-boost-checkout] Boost record created:", boost.id);

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("[create-boost-checkout] STRIPE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Payment service not configured (missing STRIPE_SECRET_KEY)" }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Create checkout session
    const origin = requestOrigin || "https://whistle-connect-hub.lovable.app";
    console.log("[create-boost-checkout] Creating Stripe session, origin:", origin);

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Boost for: ${post.title.substring(0, 50)}`,
              description: `Support this post with a €${(amount_cents / 100).toFixed(2)} boost`,
            },
            unit_amount: amount_cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/post/${post_id}?boost=success`,
      cancel_url: `${origin}/post/${post_id}?boost=cancelled`,
      metadata: {
        boost_id: boost.id,
        post_id: post_id,
        user_id: user.id,
      },
    });

    console.log("[create-boost-checkout] Stripe session created:", session.id);

    // Update boost with session ID
    await serviceClient
      .from("post_boosts")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", boost.id);

    console.log("[create-boost-checkout] Success! Returning URL");

    return new Response(
      JSON.stringify({ url: session.url, boost_id: boost.id }), 
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[create-boost-checkout] Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : "";
    console.error("[create-boost-checkout] Stack trace:", stack);
    
    return new Response(
      JSON.stringify({ error: message, type: "server_error" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
