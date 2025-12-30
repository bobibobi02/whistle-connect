import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

/**
 * Bump this when you redeploy so you can instantly confirm
 * Stripe is hitting the latest webhook build (look at responses/logs).
 */
const BUILD = "stripe-webhook-async-2025-12-30-01";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Helper for consistent logging
const log = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK][${BUILD}] ${step}${detailsStr}`);
};

const json = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify({ build: BUILD, ...payload }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  log("Webhook received", { method: req.method, url: req.url });

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!signature) {
    log("ERROR: Missing stripe-signature header");
    return json(400, { error: "Missing stripe-signature header" });
  }

  if (!webhookSecret) {
    log("ERROR: STRIPE_WEBHOOK_SECRET not configured");
    return json(500, { error: "Webhook secret not configured" });
  }

  if (!stripeSecretKey) {
    log("ERROR: STRIPE_SECRET_KEY not configured");
    return json(500, { error: "Stripe secret key not configured" });
  }

  if (!supabaseUrl || !supabaseServiceRole) {
    log("ERROR: Supabase env not configured", {
      hasUrl: !!supabaseUrl,
      hasServiceRole: !!supabaseServiceRole,
    });
    return json(500, { error: "Supabase env not configured" });
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
      // ✅ Deno/WebCrypto requires the async constructor
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      log("Signature verified", { eventType: event.type, eventId: event.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown signature error";
      log("ERROR: Signature verification failed", { error: message });
      return json(400, { error: `Webhook signature verification failed: ${message}` });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    // Helper: read metadata keys in either snake_case or camelCase
    const readMeta = (md: Record<string, string> | null | undefined) => {
      const meta = md ?? {};
      const boostId = meta["boost_id"] ?? meta["boostId"];
      const userId = meta["user_id"] ?? meta["userId"];
      const postId = meta["post_id"] ?? meta["postId"];
      return { boostId, userId, postId, meta };
    };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { boostId, userId, postId, meta } = readMeta(session.metadata as any);

        log("checkout.session.completed", {
          sessionId: session.id,
          paymentStatus: session.payment_status,
          status: session.status,
          paymentIntent: session.payment_intent,
          boostId,
          userId,
          postId,
          meta,
        });

        // If Stripe used an async payment method, completed can exist with payment_status != "paid"
        if (session.payment_status && session.payment_status !== "paid") {
          log("Payment not paid yet, skipping for now", {
            sessionId: session.id,
            paymentStatus: session.payment_status,
          });
          return json(200, { received: true, eventType: event.type, skipped: "not_paid" });
        }

        if (!boostId) {
          // Don’t 400 here or Stripe will retry forever for Workbench test events.
          log("Missing boost_id in metadata, skipping (no retry)");
          return json(200, { received: true, eventType: event.type, skipped: "missing_boost_id" });
        }

        // Idempotency check: see if boost is already succeeded
        const { data: existingBoost, error: fetchExistingError } = await supabase
          .from("post_boosts")
          .select("id, status")
          .eq("id", boostId)
          .maybeSingle();

        if (fetchExistingError) {
          log("ERROR: Failed to fetch existing boost (retry)", { error: fetchExistingError.message });
          return json(500, { error: "Failed to fetch boost (will retry)" });
        }

        if (!existingBoost) {
          // If the boost row doesn’t exist, retry won’t help.
          log("Boost not found for boostId, skipping (no retry)", { boostId });
          return json(200, { received: true, eventType: event.type, skipped: "boost_not_found" });
        }

        if (existingBoost.status === "succeeded") {
          log("Boost already succeeded, skipping (idempotent)", { boostId });
          return json(200, { received: true, eventType: event.type, idempotent: true });
        }

        // Update boost status to succeeded + store Stripe identifiers if columns exist
        const updatePayload: Record<string, any> = {
          status: "succeeded",
          // these are commonly present in your schema; harmless if they exist
          stripe_checkout_session_id: session.id,
        };
        if (session.payment_intent && typeof session.payment_intent === "string") {
          updatePayload.stripe_payment_intent_id = session.payment_intent;
        }

        // Optional: if you want to persist meta too (only if you have these columns)
        if (userId) updatePayload.from_user_id = updatePayload.from_user_id ?? undefined; // don’t overwrite
        if (postId) updatePayload.post_id = updatePayload.post_id ?? undefined; // don’t overwrite

        const { error: updateError } = await supabase.from("post_boosts").update(updatePayload).eq("id", boostId);

        if (updateError) {
          log("ERROR: Failed to update boost status (retry)", { error: updateError.message, boostId });
          return json(500, { error: "Failed to update boost (will retry)" });
        }

        log("Boost updated to succeeded", {
          boostId,
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent,
        });

        // Fetch boost for optional comment creation
        const { data: boost, error: fetchError } = await supabase
          .from("post_boosts")
          .select("id, post_id, from_user_id, message, is_public, amount_cents, currency")
          .eq("id", boostId)
          .maybeSingle();

        if (fetchError) {
          // Boost already marked succeeded; don’t force retries for comment creation.
          log("ERROR: Failed to fetch boost for comment creation (no retry)", { error: fetchError.message });
          return json(200, { received: true, eventType: event.type, warning: "comment_fetch_failed" });
        }

        if (boost && boost.is_public && boost.message && boost.message.trim()) {
          log("Creating public boost comment", { boostId, postId: boost.post_id });

          // Idempotency: Check if a comment already exists for this boost
          const { data: existingComment, error: existingCommentErr } = await supabase
            .from("comments")
            .select("id")
            .eq("boost_id", boostId)
            .maybeSingle();

          if (existingCommentErr) {
            log("ERROR: Failed to check existing comment (no retry)", { error: existingCommentErr.message });
            return json(200, { received: true, eventType: event.type, warning: "comment_check_failed" });
          }

          if (existingComment) {
            log("Boost comment already exists, skipping (idempotent)", { boostId, commentId: existingComment.id });
            return json(200, { received: true, eventType: event.type, idempotentComment: true });
          }

          const commentUserId = boost.from_user_id;
          if (!commentUserId) {
            log("No from_user_id, cannot create comment (anonymous boost without user)");
            return json(200, { received: true, eventType: event.type, skipped: "no_comment_user" });
          }

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
            log("ERROR: Failed to create boost comment (no retry)", { error: commentError.message });
            return json(200, { received: true, eventType: event.type, warning: "comment_create_failed" });
          }

          log("Boost comment created successfully", { boostId, commentId: newComment?.id });
        } else {
          log("Not creating comment: boost is private or has no message", {
            isPublic: boost?.is_public,
            hasMessage: !!boost?.message?.trim(),
          });
        }

        return json(200, { received: true, eventType: event.type });
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { boostId } = readMeta(session.metadata as any);

        log("checkout.session.expired", { sessionId: session.id, boostId });

        if (!boostId) {
          return json(200, { received: true, eventType: event.type, skipped: "missing_boost_id" });
        }

        const { data: existingBoost, error: fetchErr } = await supabase
          .from("post_boosts")
          .select("id, status")
          .eq("id", boostId)
          .maybeSingle();

        if (fetchErr) {
          log("ERROR: Failed to fetch boost on expired (retry)", { error: fetchErr.message });
          return json(500, { error: "Failed to fetch boost (will retry)" });
        }

        if (!existingBoost) {
          log("Boost not found on expired, skipping (no retry)", { boostId });
          return json(200, { received: true, eventType: event.type, skipped: "boost_not_found" });
        }

        if (existingBoost.status === "succeeded") {
          log("Boost already succeeded; not marking failed", { boostId });
          return json(200, { received: true, eventType: event.type, idempotent: true });
        }

        const { error } = await supabase.from("post_boosts").update({ status: "failed" }).eq("id", boostId);
        if (error) {
          log("ERROR: Failed to update boost to failed (retry)", { error: error.message });
          return json(500, { error: "Failed to update boost (will retry)" });
        }

        log("Boost status updated to failed", { boostId });
        return json(200, { received: true, eventType: event.type });
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent;

        log("charge.refunded", { chargeId: charge.id, paymentIntentId });

        // (Keeping your old behavior; refund mapping depends on your schema)
        return json(200, { received: true, eventType: event.type });
      }

      default:
        log("Unhandled event type, returning 200", { eventType: event.type });
        return json(200, { received: true, eventType: event.type });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log("ERROR: Unexpected error", { error: message });
    return json(500, { error: message });
  }
});
