import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Helper for consistent logging
const log = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  log("Webhook received", { method: req.method });

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!signature) {
    log("ERROR: Missing stripe-signature header");
    return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), { 
      status: 400, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  if (!webhookSecret) {
    log("ERROR: STRIPE_WEBHOOK_SECRET not configured");
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  if (!stripeSecretKey) {
    log("ERROR: STRIPE_SECRET_KEY not configured");
    return new Response(JSON.stringify({ error: "Stripe secret key not configured" }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Read the raw body for signature verification
    const body = await req.text();
    log("Body received", { length: body.length });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      log("Signature verified", { eventType: event.type, eventId: event.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown signature error";
      log("ERROR: Signature verification failed", { error: message });
      return new Response(JSON.stringify({ error: `Webhook signature verification failed: ${message}` }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const boostId = session.metadata?.boost_id;

        log("checkout.session.completed", { sessionId: session.id, boostId, paymentStatus: session.payment_status });

        if (!boostId) {
          log("No boost_id in metadata, skipping");
          break;
        }

        // Idempotency check: see if boost is already succeeded
        const { data: existingBoost, error: fetchExistingError } = await supabase
          .from("post_boosts")
          .select("id, status")
          .eq("id", boostId)
          .single();

        if (fetchExistingError) {
          log("ERROR: Failed to fetch existing boost", { error: fetchExistingError.message });
          break;
        }

        if (existingBoost?.status === "succeeded") {
          log("Boost already succeeded, skipping (idempotent)", { boostId });
          break;
        }

        // Update boost status to succeeded
        const { error: updateError } = await supabase
          .from("post_boosts")
          .update({ status: "succeeded" })
          .eq("id", boostId);

        if (updateError) {
          log("ERROR: Failed to update boost status", { error: updateError.message });
        } else {
          log("Boost status updated to succeeded", { boostId });

          // Fetch the boost to check if we should create a public comment
          const { data: boost, error: fetchError } = await supabase
            .from("post_boosts")
            .select("id, post_id, from_user_id, message, is_public, amount_cents, currency")
            .eq("id", boostId)
            .single();

          if (fetchError) {
            log("ERROR: Failed to fetch boost for comment creation", { error: fetchError.message });
          } else if (boost && boost.is_public && boost.message && boost.message.trim()) {
            log("Creating public boost comment", { boostId, postId: boost.post_id });

            // Idempotency: Check if a comment already exists for this boost
            const { data: existingComment } = await supabase
              .from("comments")
              .select("id")
              .eq("boost_id", boostId)
              .maybeSingle();

            if (existingComment) {
              log("Boost comment already exists, skipping (idempotent)", { boostId, commentId: existingComment.id });
            } else {
              // Create the public boost comment
              const commentUserId = boost.from_user_id;
              
              if (commentUserId) {
                const { data: newComment, error: commentError } = await supabase
                  .from("comments")
                  .insert({
                    post_id: boost.post_id,
                    user_id: commentUserId,
                    content: boost.message,
                    boost_id: boost.id,
                  })
                  .select("id")
                  .single();

                if (commentError) {
                  log("ERROR: Failed to create boost comment", { error: commentError.message });
                } else {
                  log("Boost comment created successfully", { boostId, commentId: newComment?.id });
                }
              } else {
                log("No from_user_id, cannot create comment (anonymous boost without user)");
              }
            }
          } else {
            log("Not creating comment: boost is private or has no message", { 
              isPublic: boost?.is_public, 
              hasMessage: !!(boost?.message?.trim()) 
            });
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const boostId = session.metadata?.boost_id;

        log("checkout.session.expired", { sessionId: session.id, boostId });

        if (boostId) {
          const { error } = await supabase
            .from("post_boosts")
            .update({ status: "failed" })
            .eq("id", boostId);
          
          if (error) {
            log("ERROR: Failed to update boost to failed", { error: error.message });
          } else {
            log("Boost status updated to failed", { boostId });
          }
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent;

        log("charge.refunded", { chargeId: charge.id, paymentIntentId });

        if (paymentIntentId && typeof paymentIntentId === 'string') {
          // Find boost by looking up checkout sessions with this payment intent
          // Note: We store checkout session ID, not payment intent, so we need to query differently
          const { data: boosts, error } = await supabase
            .from("post_boosts")
            .select("id, stripe_checkout_session_id")
            .eq("status", "succeeded");

          if (error) {
            log("ERROR: Failed to query boosts for refund", { error: error.message });
          } else if (boosts && boosts.length > 0) {
            // For now, log this - in production you'd want to verify via Stripe API
            log("Potential refund for succeeded boosts", { count: boosts.length, paymentIntentId });
          }
        }
        break;
      }

      default:
        // Return 200 for unhandled event types to prevent Stripe retry storms
        log("Unhandled event type, returning 200", { eventType: event.type });
    }

    return new Response(JSON.stringify({ received: true, eventType: event.type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log("ERROR: Unexpected error", { error: message });
    return new Response(JSON.stringify({ error: message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
