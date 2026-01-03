import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[compute-feed-profiles] Starting profile computation...");

    // Get users with recent feed events (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: activeUsers, error: usersError } = await supabase
      .from("feed_events")
      .select("user_id")
      .gte("created_at", thirtyDaysAgo)
      .order("user_id");

    if (usersError) {
      console.error("[compute-feed-profiles] Error fetching active users:", usersError);
      throw usersError;
    }

    // Deduplicate user IDs
    const uniqueUserIds = [...new Set(activeUsers?.map(e => e.user_id) || [])];
    console.log(`[compute-feed-profiles] Processing ${uniqueUserIds.length} active users`);

    let processedCount = 0;
    let errorCount = 0;

    for (const userId of uniqueUserIds) {
      try {
        // Get user's feed events from last 30 days
        const { data: events, error: eventsError } = await supabase
          .from("feed_events")
          .select("event_type, watch_time_ms, video_duration_ms, post_id, metadata, created_at")
          .eq("user_id", userId)
          .gte("created_at", thirtyDaysAgo);

        if (eventsError) {
          console.error(`[compute-feed-profiles] Error fetching events for ${userId}:`, eventsError);
          errorCount++;
          continue;
        }

        if (!events || events.length === 0) continue;

        // Calculate metrics
        const watchTimeEvents = events.filter(e => e.event_type === "watch_time" && e.watch_time_ms);
        const completeEvents = events.filter(e => e.event_type === "view_complete");
        const viewStartEvents = events.filter(e => e.event_type === "view_start");

        // Average watch time
        const avgWatchTimeMs = watchTimeEvents.length > 0
          ? Math.round(watchTimeEvents.reduce((sum, e) => sum + (e.watch_time_ms || 0), 0) / watchTimeEvents.length)
          : null;

        // Completion rate
        const completionRate = viewStartEvents.length > 0
          ? Math.round((completeEvents.length / viewStartEvents.length) * 100) / 100
          : null;

        // Video length preferences (based on video_duration_ms)
        const videoLengthEvents = events.filter(e => e.video_duration_ms && e.event_type === "view_complete");
        let shortPref = 0, midPref = 0, longPref = 0;
        
        for (const event of videoLengthEvents) {
          const durationSec = (event.video_duration_ms || 0) / 1000;
          if (durationSec <= 60) shortPref++;
          else if (durationSec <= 180) midPref++;
          else longPref++;
        }

        const totalLengthEvents = shortPref + midPref + longPref;
        const shortVideoPreference = totalLengthEvents > 0 ? Math.round((shortPref / totalLengthEvents) * 100) / 100 : 0.33;
        const midVideoPreference = totalLengthEvents > 0 ? Math.round((midPref / totalLengthEvents) * 100) / 100 : 0.34;
        const longVideoPreference = totalLengthEvents > 0 ? Math.round((longPref / totalLengthEvents) * 100) / 100 : 0.33;

        // Get top communities from engaged posts
        const engagedPostIds = [...new Set(
          events
            .filter(e => ["like", "comment", "view_complete", "share", "save"].includes(e.event_type))
            .map(e => e.post_id)
        )];

        let topCommunities: string[] = [];
        let topCreators: string[] = [];

        if (engagedPostIds.length > 0) {
          const { data: posts } = await supabase
            .from("posts")
            .select("community, user_id")
            .in("id", engagedPostIds.slice(0, 100));

          if (posts) {
            // Count community engagements
            const communityCount: Record<string, number> = {};
            const creatorCount: Record<string, number> = {};

            for (const post of posts) {
              communityCount[post.community] = (communityCount[post.community] || 0) + 1;
              creatorCount[post.user_id] = (creatorCount[post.user_id] || 0) + 1;
            }

            topCommunities = Object.entries(communityCount)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([c]) => c);

            topCreators = Object.entries(creatorCount)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([c]) => c);
          }
        }

        // Upsert user feed profile
        const { error: upsertError } = await supabase
          .from("user_feed_profiles")
          .upsert({
            user_id: userId,
            avg_watch_time_ms: avgWatchTimeMs,
            completion_rate: completionRate,
            short_video_preference: shortVideoPreference,
            mid_video_preference: midVideoPreference,
            long_video_preference: longVideoPreference,
            top_communities: topCommunities,
            top_creators: topCreators,
            last_computed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "user_id",
          });

        if (upsertError) {
          console.error(`[compute-feed-profiles] Error upserting profile for ${userId}:`, upsertError);
          errorCount++;
        } else {
          processedCount++;
        }
      } catch (err) {
        console.error(`[compute-feed-profiles] Error processing user ${userId}:`, err);
        errorCount++;
      }
    }

    console.log(`[compute-feed-profiles] Completed: ${processedCount} profiles updated, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        processedCount,
        errorCount,
        totalUsers: uniqueUserIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[compute-feed-profiles] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
