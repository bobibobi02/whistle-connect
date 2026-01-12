import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdHideInput {
  campaignId?: string;
  creativeId?: string;
  advertiserId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Create client with user's auth token to verify identity
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Extract user ID from JWT claims
    const userId = claimsData.claims.sub as string;
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "User ID not found in token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Now use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const input: AdHideInput = await req.json();
    const { campaignId, advertiserId } = input;

    // Get existing preferences or create new
    const { data: existingPrefs } = await supabase
      .from("user_ad_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    let hiddenCampaignIds = existingPrefs?.hidden_campaign_ids || [];
    let hiddenAdvertiserIds = existingPrefs?.hidden_advertiser_ids || [];

    // Add campaign to hidden list
    if (campaignId && !hiddenCampaignIds.includes(campaignId)) {
      hiddenCampaignIds = [...hiddenCampaignIds, campaignId];
    }

    // Add advertiser to hidden list
    if (advertiserId && !hiddenAdvertiserIds.includes(advertiserId)) {
      hiddenAdvertiserIds = [...hiddenAdvertiserIds, advertiserId];
    }

    // Upsert preferences
    const { error: upsertError } = await supabase
      .from("user_ad_preferences")
      .upsert({
        user_id: userId,
        hidden_campaign_ids: hiddenCampaignIds,
        hidden_advertiser_ids: hiddenAdvertiserIds,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      });

    if (upsertError) {
      console.error("Error updating ad preferences:", upsertError);
      return new Response(
        JSON.stringify({ success: false, error: upsertError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Ad hide error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
