import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
    console.log("[create-boost-checkout] Request received");
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[create-boost-checkout] No authorization header");
      throw new Error("Authorization required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error("[create-boost-checkout] Auth failed:", authError);
      throw new Error("Authentication failed");
    }

    console.log("[create-boost-checkout] User authenticated:", user.id);

    const { post_id, amount_cents, message, is_public } = await req.json();
    console.log("[create-boost-checkout] Request body:", { post_id, amount_cents, message, is_public });

    if (!post_id || !amount_cents || amount_cents < 100) {
      throw new Error("Invalid request: post_id and amount_cents (min 100) required");
    }

    // Verify post exists using service client (bypasses RLS)
    const { data: post, error: postError } = await serviceClient
      .from("posts")
      .select("id, title")
      .eq("id", post_id)
      .single();

    if (postError) {
      console.error("[create-boost-checkout] Post query error:", postError);
      throw new Error(`Post not found: ${postError.message}`);
    }

    if (!post) {
      console.error("[create-boost-checkout] Post not found for id:", post_id);
      throw new Error("Post not found");
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
      throw new Error("Failed to create boost record");
    }

    console.log("[create-boost-checkout] Boost record created:", boost.id);

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("[create-boost-checkout] STRIPE_SECRET_KEY not configured");
      throw new Error("Payment service not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Create checkout session
    const origin = req.headers.get("origin") || "https://whistle-connect-hub.lovable.app";
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

    return new Response(JSON.stringify({ url: session.url, boost_id: boost.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[create-boost-checkout] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
