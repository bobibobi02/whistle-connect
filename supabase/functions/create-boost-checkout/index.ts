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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Authentication failed");
    }

    const { post_id, amount_cents, message, is_public } = await req.json();

    if (!post_id || !amount_cents || amount_cents < 100) {
      throw new Error("Invalid request: post_id and amount_cents (min 100) required");
    }

    // Verify post exists
    const { data: post, error: postError } = await supabaseClient
      .from("posts")
      .select("id, title")
      .eq("id", post_id)
      .single();

    if (postError || !post) {
      throw new Error("Post not found");
    }

    // Create pending boost record
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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
      console.error("Boost insert error:", boostError);
      throw new Error("Failed to create boost record");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create checkout session
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
      success_url: `${req.headers.get("origin")}/post/${post_id}?boost=success`,
      cancel_url: `${req.headers.get("origin")}/post/${post_id}?boost=cancelled`,
      metadata: {
        boost_id: boost.id,
        post_id: post_id,
        user_id: user.id,
      },
    });

    // Update boost with session ID
    await serviceClient
      .from("post_boosts")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", boost.id);

    console.log("Boost created:", { boost_id: boost.id, message: boost.message, is_public: boost.is_public });

    return new Response(JSON.stringify({ url: session.url, boost_id: boost.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
