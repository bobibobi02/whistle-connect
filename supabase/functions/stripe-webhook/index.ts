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
          // First update status to succeeded
          const { error: updateError } = await supabase
            .from("post_boosts")
            .update({ status: "succeeded" })
            .eq("id", boostId);

          if (updateError) {
            console.error("Failed to update boost status:", updateError);
          } else {
            console.log(`Boost ${boostId} marked as succeeded`);

            // Fetch the boost to check if we should create a public comment
            const { data: boost, error: fetchError } = await supabase
              .from("post_boosts")
              .select("id, post_id, from_user_id, message, is_public, amount_cents, currency")
              .eq("id", boostId)
              .single();

            if (fetchError) {
              console.error("Failed to fetch boost:", fetchError);
            } else if (boost && boost.is_public && boost.message && boost.message.trim()) {
              // Check if a comment already exists for this boost (idempotency)
              const { data: existingComment } = await supabase
                .from("comments")
                .select("id")
                .eq("boost_id", boostId)
                .maybeSingle();

              if (!existingComment) {
                // Create a public boost comment
                const amountDisplay = (boost.amount_cents / 100).toFixed(2);
                const currencyUpper = (boost.currency || 'EUR').toUpperCase();
                
                // Use the booster's user_id or a system user
                const commentUserId = boost.from_user_id;
                
                if (commentUserId) {
                  const { error: commentError } = await supabase
                    .from("comments")
                    .insert({
                      post_id: boost.post_id,
                      user_id: commentUserId,
                      content: boost.message,
                      boost_id: boost.id,
                    });

                  if (commentError) {
                    console.error("Failed to create boost comment:", commentError);
                  } else {
                    console.log(`Boost comment created for boost ${boostId}`);
                  }
                }
              } else {
                console.log(`Boost comment already exists for boost ${boostId}`);
              }
            }
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
