import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

/**
 * Change this every deploy. Then you can instantly confirm
 * the new version is live by opening the webhook URL in a browser (GET).
 */
const BUILD = "stripe-webhook-async-health-2025-12-30-02";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET, HEAD",
};

const log = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK][${BUILD}] ${step}${detailsStr}`);
};

const json = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify({ build: BUILD, ...payload }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const hostnameFromUrl = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ✅ Health check (NO Stripe signature needed)
  // Open the webhook URL in a browser and you should see this JSON.
  if (req.method === "GET" || req.method === "HEAD") {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    return json(200, {
      ok: true,
      message: "stripe-webhook alive",
      supabase_host: hostnameFromUrl(supabaseUrl),
    });
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

    const body = await req.text();
    log("Body received", { length: body.length });

    let event: Stripe.Event;
    try {
      // ✅ REQUIRED in Deno/WebCrypto
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      log("Signature verified", { eventType: event.type, eventId: event.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown signature error";
      log("ERROR: Signature verification failed", { error: message });
      return json(400, { error: `Webhook signature verification failed: ${message}` });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRole);

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
        const { boostId, meta } = readMeta(session.metadata as any);

        log("checkout.session.completed", {
          sessionId: session.id,
          paymentStatus: session.payment_status,
          boostId,
          meta,
        });

        if (session.payment_status && session.payment_status !== "paid") {
          log("Payment not paid yet, skipping", {
            sessionId: session.id,
            paymentStatus: session.payment_status,
          });
          return json(200, { received: true, eventType: event.type, skipped: "not_paid" });
        }

        if (!boostId) {
          log("Missing boost_id in metadata, skipping (no retry)");
          return json(200, { received: true, eventType: event.type, skipped: "missing_boost_id" });
        }

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
          log("Boost not found for boostId, skipping (no retry)", { boostId });
          return json(200, { received: true, eventType: event.type, skipped: "boost_not_found" });
        }

        if (existingBoost.status === "succeeded") {
          log("Boost already succeeded, idempotent", { boostId });
          return json(200, { received: true, eventType: event.type, idempotent: true });
        }

        const updatePayload: Record<string, any> = {
          status: "succeeded",
          stripe_checkout_session_id: session.id,
        };
        if (session.payment_intent && typeof session.payment_intent === "string") {
          updatePayload.stripe_payment_intent_id = session.payment_intent;
        }

        const { error: updateError } = await supabase.from("post_boosts").update(updatePayload).eq("id", boostId);

        if (updateError) {
          log("ERROR: Failed to update boost (retry)", { error: updateError.message, boostId });
          return json(500, { error: "Failed to update boost (will retry)" });
        }

        log("Boost updated to succeeded", { boostId });

        const { data: boost, error: fetchError } = await supabase
          .from("post_boosts")
          .select("id, post_id, from_user_id, message, is_public, amount_cents, currency")
          .eq("id", boostId)
          .maybeSingle();

        if (fetchError) {
          log("ERROR: Failed to fetch boost for comment creation (no retry)", { error: fetchError.message });
          return json(200, { received: true, eventType: event.type, warning: "comment_fetch_failed" });
        }

        if (boost && boost.is_public && boost.message && boost.message.trim()) {
          const { data: existingComment } = await supabase
            .from("comments")
            .select("id")
            .eq("boost_id", boostId)
            .maybeSingle();

          if (existingComment) {
            log("Boost comment already exists, idempotent", { boostId, commentId: existingComment.id });
            return json(200, { received: true, eventType: event.type, idempotentComment: true });
          }

          if (boost.from_user_id) {
            const { error: commentError } = await supabase.from("comments").insert({
              post_id: boost.post_id,
              user_id: boost.from_user_id,
              content: boost.message,
              boost_id: boost.id,
            });

            if (commentError) {
              log("ERROR: Failed to create boost comment (no retry)", { error: commentError.message });
            } else {
              log("Boost comment created", { boostId });
            }
          } else {
            log("No from_user_id, cannot create comment");
          }
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
          return json(200, { received: true, eventType: event.type, skipped: "boost_not_found" });
        }

        if (existingBoost.status === "succeeded") {
          return json(200, { received: true, eventType: event.type, idempotent: true });
        }

        const { error } = await supabase.from("post_boosts").update({ status: "failed" }).eq("id", boostId);
        if (error) {
          log("ERROR: Failed to update boost to failed (retry)", { error: error.message });
          return json(500, { error: "Failed to update boost (will retry)" });
        }

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
