import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const boostId = session.metadata?.boost_id;

        if (boostId) {
          const { error } = await supabase
            .from("post_boosts")
            .update({ status: "succeeded" })
            .eq("id", boostId);

          if (error) {
            console.error("Failed to update boost status:", error);
          } else {
            console.log(`Boost ${boostId} marked as succeeded`);
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const boostId = session.metadata?.boost_id;

        if (boostId) {
          await supabase
            .from("post_boosts")
            .update({ status: "failed" })
            .eq("id", boostId);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const sessionId = charge.payment_intent;

        if (sessionId) {
          // Find boost by session and mark as refunded
          const { data: boosts } = await supabase
            .from("post_boosts")
            .select("id")
            .eq("stripe_checkout_session_id", sessionId);

          if (boosts && boosts.length > 0) {
            await supabase
              .from("post_boosts")
              .update({ status: "refunded" })
              .eq("id", boosts[0].id);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Webhook error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }
});
