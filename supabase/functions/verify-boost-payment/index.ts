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

  try {
    const { boost_id } = await req.json();

    if (!boost_id) {
      throw new Error("boost_id required");
    }

    console.log("Verifying boost payment for:", boost_id);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the boost record
    const { data: boost, error: boostError } = await serviceClient
      .from("post_boosts")
      .select("*")
      .eq("id", boost_id)
      .single();

    if (boostError || !boost) {
      console.error("Boost not found:", boostError);
      throw new Error("Boost not found");
    }

    console.log("Found boost:", { 
      id: boost.id, 
      status: boost.status, 
      session_id: boost.stripe_checkout_session_id,
      message: boost.message,
      is_public: boost.is_public
    });

    // If already succeeded, return success
    if (boost.status === "succeeded") {
      console.log("Boost already succeeded");
      return new Response(JSON.stringify({ 
        success: true, 
        status: "succeeded",
        message: boost.message,
        is_public: boost.is_public
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // If no session ID, can't verify
    if (!boost.stripe_checkout_session_id) {
      throw new Error("No checkout session ID found");
    }

    // Initialize Stripe and check session status
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(boost.stripe_checkout_session_id);
    console.log("Stripe session status:", session.payment_status);

    if (session.payment_status === "paid") {
      // Update boost to succeeded - PRESERVE message and is_public
      const { error: updateError } = await serviceClient
        .from("post_boosts")
        .update({ status: "succeeded" })
        .eq("id", boost_id);

      if (updateError) {
        console.error("Failed to update boost:", updateError);
        throw new Error("Failed to update boost status");
      }

      console.log("Boost marked as succeeded, message:", boost.message, "is_public:", boost.is_public);

      return new Response(JSON.stringify({ 
        success: true, 
        status: "succeeded",
        message: boost.message,
        is_public: boost.is_public
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      status: boost.status,
      payment_status: session.payment_status
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Verify error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
