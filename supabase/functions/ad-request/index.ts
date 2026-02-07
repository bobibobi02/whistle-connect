import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AdRequestContext {
  placementKey: string;
  loopId?: string;
  postId?: string;
  pageType?: string;
  keywords?: string[];
  isNsfw?: boolean;
  deviceType?: string;
  sessionId?: string;
}

interface Campaign {
  id: string;
  advertiser_id: string;
  name: string;
  objective: string;
  status: string;
  bid_type: string;
  bid_value_cents: number;
  budget_cents: number;
  spent_cents: number;
  daily_cap_cents: number | null;
  start_at: string | null;
  end_at: string | null;
}

interface Creative {
  id: string;
  campaign_id: string;
  type: string;
  headline: string;
  body: string | null;
  image_url: string | null;
  video_url: string | null;
  click_url: string;
  display_url: string | null;
  call_to_action: string;
  advertiser_name: string | null;
  advertiser_icon: string | null;
  status: string;
}

interface TargetingRule {
  campaign_id: string;
  countries: string[];
  languages: string[];
  communities: string[];
  keywords: string[];
  exclude_keywords: string[];
  nsfw_allowed: boolean;
  device_types: string[];
  min_account_age_days: number;
  placement_keys: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { context, userId }: { context: AdRequestContext; userId?: string } = await req.json();
    const { placementKey, loopId, postId, isNsfw, deviceType, sessionId, keywords = [] } = context;

    // Check if placement is enabled
    const { data: placement, error: placementError } = await supabase
      .from("placements")
      .select("*")
      .eq("key", placementKey)
      .eq("enabled", true)
      .limit(1)
      .maybeSingle();

    if (placementError || !placement) {
      return new Response(
        JSON.stringify({ ad: null, reason: "placement_disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user ad preferences for hidden campaigns
    let hiddenCampaignIds: string[] = [];
    if (userId) {
      const { data: prefs } = await supabase
        .from("user_ad_preferences")
        .select("hidden_campaign_ids, hidden_advertiser_ids")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      
      if (prefs) {
        hiddenCampaignIds = prefs.hidden_campaign_ids || [];
      }
    }

    // Get active campaigns with their creatives and targeting
    const now = new Date().toISOString();
    let campaignsQuery = supabase
      .from("campaigns")
      .select(`
        *,
        creatives:creatives(*)
      `)
      .eq("status", "active")
      .or(`start_at.is.null,start_at.lte.${now}`)
      .or(`end_at.is.null,end_at.gte.${now}`);

    const { data: campaigns, error: campaignsError } = await campaignsQuery;

    if (campaignsError || !campaigns || campaigns.length === 0) {
      return new Response(
        JSON.stringify({ ad: null, reason: "no_active_campaigns" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get targeting rules for all campaigns
    const campaignIds = campaigns.map((c: Campaign) => c.id);
    const { data: targetingRules } = await supabase
      .from("targeting_rules")
      .select("*")
      .in("campaign_id", campaignIds);

    const targetingMap = new Map<string, TargetingRule>();
    (targetingRules || []).forEach((rule: TargetingRule) => {
      targetingMap.set(rule.campaign_id, rule);
    });

    // Filter and score campaigns
    const eligibleCampaigns: Array<{ campaign: Campaign; creative: Creative; score: number }> = [];

    for (const campaign of campaigns) {
      // Skip hidden campaigns
      if (hiddenCampaignIds.includes(campaign.id)) continue;

      // Check budget
      if (campaign.spent_cents >= campaign.budget_cents) continue;

      // Get active creative
      const activeCreative = campaign.creatives?.find((c: Creative) => c.status === "active");
      if (!activeCreative) continue;

      // Check targeting
      const targeting = targetingMap.get(campaign.id);
      if (targeting) {
        // Check placement targeting
        if (targeting.placement_keys.length > 0 && !targeting.placement_keys.includes(placementKey)) {
          continue;
        }

        // Check NSFW
        if (isNsfw && !targeting.nsfw_allowed) continue;

        // Check community targeting
        if (targeting.communities.length > 0 && loopId && !targeting.communities.includes(loopId)) {
          continue;
        }

        // Check device type
        if (targeting.device_types.length > 0 && deviceType && !targeting.device_types.includes(deviceType)) {
          continue;
        }

        // Check exclude keywords
        if (targeting.exclude_keywords.length > 0) {
          const hasExcluded = targeting.exclude_keywords.some((kw: string) => 
            keywords.some((k: string) => k.toLowerCase().includes(kw.toLowerCase()))
          );
          if (hasExcluded) continue;
        }
      }

      // Calculate score (simple bid-based for now)
      let score = campaign.bid_value_cents;

      // Boost score for keyword matches
      if (targeting?.keywords && targeting.keywords.length > 0) {
        const keywordMatches = targeting.keywords.filter((kw: string) =>
          keywords.some((k: string) => k.toLowerCase().includes(kw.toLowerCase()))
        ).length;
        score += keywordMatches * 10; // Bonus for relevance
      }

      // Boost for community targeting match
      if (targeting?.communities && loopId && targeting.communities.includes(loopId)) {
        score += 20;
      }

      // Add some randomness to prevent same ad always showing
      score += Math.random() * 10;

      eligibleCampaigns.push({
        campaign,
        creative: activeCreative,
        score,
      });
    }

    if (eligibleCampaigns.length === 0) {
      return new Response(
        JSON.stringify({ ad: null, reason: "no_eligible_campaigns" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sort by score and pick the best
    eligibleCampaigns.sort((a, b) => b.score - a.score);
    const winner = eligibleCampaigns[0];

    // Create ad request record
    const { data: adRequest, error: requestError } = await supabase
      .from("ad_requests")
      .insert({
        placement_key: placementKey,
        user_id: userId || null,
        session_id: sessionId || null,
        context: { loopId, postId, keywords, isNsfw, deviceType },
        campaign_id: winner.campaign.id,
        creative_id: winner.creative.id,
      })
      .select()
      .single();

    if (requestError) {
      console.error("Error creating ad request:", requestError);
    }

    // Return the ad
    return new Response(
      JSON.stringify({
        ad: {
          requestId: adRequest?.id || null,
          campaignId: winner.campaign.id,
          creativeId: winner.creative.id,
          type: winner.creative.type,
          headline: winner.creative.headline,
          body: winner.creative.body,
          imageUrl: winner.creative.image_url,
          videoUrl: winner.creative.video_url,
          clickUrl: winner.creative.click_url,
          displayUrl: winner.creative.display_url,
          callToAction: winner.creative.call_to_action,
          advertiserName: winner.creative.advertiser_name,
          advertiserIcon: winner.creative.advertiser_icon,
          placementKey,
        },
        reason: "success",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Ad request error:", error);
    return new Response(
      JSON.stringify({ ad: null, reason: "error", error: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
