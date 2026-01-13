import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdEventInput {
  requestId: string | null;
  campaignId: string;
  creativeId: string;
  placementKey: string;
  eventType: "impression" | "click" | "hide" | "skip" | "complete";
  postId?: string;
  community?: string;
  userId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const input: AdEventInput = await req.json();
    const { requestId, campaignId, creativeId, placementKey, eventType, postId, community, userId } = input;

    // Get IP hash and user agent hash for deduplication
    const ipHash = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    const userAgentHash = req.headers.get("user-agent") || "";

    // Check for duplicate impression (within last 60 seconds)
    if (eventType === "impression") {
      const dedupSeconds = 60;
      const cutoff = new Date(Date.now() - dedupSeconds * 1000).toISOString();

      let query = supabase
        .from("ad_events")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("creative_id", creativeId)
        .eq("event_type", "impression")
        .gte("created_at", cutoff);

      if (userId) {
        query = query.eq("user_id", userId);
      } else if (ipHash) {
        const hashedIp = await hashString(ipHash);
        query = query.eq("ip_hash", hashedIp);
      }

      const { data: existingEvents } = await query.limit(1);

      if (existingEvents && existingEvents.length > 0) {
        return new Response(
          JSON.stringify({ success: true, deduplicated: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get campaign to calculate revenue
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("bid_type, bid_value_cents")
      .eq("id", campaignId)
      .single();

    if (!campaign) {
      return new Response(
        JSON.stringify({ success: false, error: "Campaign not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Calculate revenue based on event type and bid model
    let revenueCents = 0;
    if (campaign.bid_type === "cpm" && eventType === "impression") {
      // CPM = cost per 1000 impressions
      revenueCents = Math.round(campaign.bid_value_cents / 1000);
    } else if (campaign.bid_type === "cpc" && eventType === "click") {
      revenueCents = campaign.bid_value_cents;
    }

    // Insert ad event
    const { data: adEvent, error: eventError } = await supabase
      .from("ad_events")
      .insert({
        ad_request_id: requestId,
        campaign_id: campaignId,
        creative_id: creativeId,
        placement_key: placementKey,
        event_type: eventType,
        user_id: userId || null,
        post_id: postId || null,
        community: community || null,
        ip_hash: ipHash ? await hashString(ipHash) : null,
        user_agent_hash: userAgentHash ? await hashString(userAgentHash) : null,
        revenue_cents: revenueCents,
      })
      .select()
      .single();

    if (eventError) {
      console.error("Error inserting ad event:", eventError);
      return new Response(
        JSON.stringify({ success: false, error: eventError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Update campaign spent amount
    if (revenueCents > 0) {
      await supabase
        .from("campaigns")
        .update({ spent_cents: (campaign as any).spent_cents + revenueCents })
        .eq("id", campaignId);
    }

    // If impression/click on a post, calculate creator revenue allocation
    if (postId && revenueCents > 0 && (eventType === "impression" || eventType === "click")) {
      await allocateCreatorRevenue(supabase, adEvent.id, postId, revenueCents);
    }

    return new Response(
      JSON.stringify({ success: true, eventId: adEvent.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Ad event error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").substring(0, 32);
}

async function allocateCreatorRevenue(
  supabase: SupabaseClient,
  adEventId: string,
  postId: string,
  totalRevenueCents: number
) {
  try {
    // Get post owner
    const { data: post } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", postId)
      .single();

    if (!post) return;
    const postUserId = (post as any).user_id;

    // Check if creator has monetization enabled
    const { data: monetization } = await supabase
      .from("creator_monetization")
      .select("enabled, creator_share_percent, eligibility_status, total_earnings_cents, pending_payout_cents")
      .eq("user_id", postUserId)
      .limit(1)
      .maybeSingle();

    if (!monetization) return;
    const mon = monetization as any;
    
    if (!mon.enabled || mon.eligibility_status !== "eligible") {
      return;
    }

    // Calculate creator share
    const creatorSharePercent = mon.creator_share_percent || 55;
    const creatorAmount = Math.round((totalRevenueCents * creatorSharePercent) / 100);

    if (creatorAmount <= 0) return;

    // Insert revenue allocation
    await supabase.from("ad_revenue_allocations").insert({
      ad_event_id: adEventId,
      creator_user_id: postUserId,
      post_id: postId,
      amount_cents: creatorAmount,
      status: "estimated",
    });

    // Update or create earnings record for current period
    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);
    
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    periodEnd.setDate(0);

    const { data: existingEarnings } = await supabase
      .from("creator_earnings")
      .select("id, estimated_cents, impressions, clicks")
      .eq("user_id", postUserId)
      .eq("period_start", periodStart.toISOString().split("T")[0])
      .limit(1)
      .maybeSingle();

    if (existingEarnings) {
      const existing = existingEarnings as any;
      await supabase
        .from("creator_earnings")
        .update({
          estimated_cents: existing.estimated_cents + creatorAmount,
          impressions: existing.impressions + 1,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("creator_earnings").insert({
        user_id: postUserId,
        period_start: periodStart.toISOString().split("T")[0],
        period_end: periodEnd.toISOString().split("T")[0],
        estimated_cents: creatorAmount,
        impressions: 1,
        clicks: 0,
        status: "estimated",
      });
    }

    // Update total earnings in monetization table
    await supabase
      .from("creator_monetization")
      .update({
        total_earnings_cents: mon.total_earnings_cents + creatorAmount,
        pending_payout_cents: mon.pending_payout_cents + creatorAmount,
      })
      .eq("user_id", postUserId);

  } catch (error) {
    console.error("Error allocating creator revenue:", error);
  }
}
