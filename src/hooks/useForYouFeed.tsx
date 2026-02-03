import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Post, PostFlair, getBlockedUserIds } from "@/hooks/usePosts";

const POSTS_PER_PAGE = 10;

// Video length categories in seconds
const SHORT_VIDEO_MAX = 60; // <= 60s is short
const LONG_VIDEO_MIN = 180; // >= 3 min is long

interface UserFeedProfile {
  avg_watch_time_ms: number;
  completion_rate: number;
  short_video_preference: number;
  mid_video_preference: number;
  long_video_preference: number;
  top_communities: string[];
  top_creators: string[];
}

const defaultProfile: UserFeedProfile = {
  avg_watch_time_ms: 0,
  completion_rate: 0.5,
  short_video_preference: 0.33,
  mid_video_preference: 0.34,
  long_video_preference: 0.33,
  top_communities: [],
  top_creators: [],
};

// Fetch user's feed profile
const fetchUserProfile = async (userId: string): Promise<UserFeedProfile> => {
  const { data, error } = await supabase
    .from("user_feed_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return defaultProfile;

  return {
    avg_watch_time_ms: data.avg_watch_time_ms || 0,
    completion_rate: data.completion_rate || 0.5,
    short_video_preference: data.short_video_preference || 0.33,
    mid_video_preference: data.mid_video_preference || 0.34,
    long_video_preference: data.long_video_preference || 0.33,
    top_communities: (data.top_communities as string[]) || [],
    top_creators: (data.top_creators as string[]) || [],
  };
};

// Score a post for the For You feed
const scorePost = (
  post: any,
  profile: UserFeedProfile,
  nowMs: number
): number => {
  let score = 0;
  const ageHours = (nowMs - new Date(post.created_at).getTime()) / 3600000;

  // Base engagement score (upvotes with decay)
  const engagementScore = post.upvotes / Math.pow(ageHours + 2, 1.2);
  score += engagementScore * 10;

  // Freshness bonus for very new content
  if (ageHours < 2) score += 20;
  else if (ageHours < 6) score += 10;
  else if (ageHours < 24) score += 5;

  // Video-specific scoring
  if (post.video_url && post.video_duration_seconds) {
    const duration = post.video_duration_seconds;

    // Length preference matching
    if (duration <= SHORT_VIDEO_MAX) {
      score += profile.short_video_preference * 15;
    } else if (duration >= LONG_VIDEO_MIN) {
      score += profile.long_video_preference * 15;
    } else {
      score += profile.mid_video_preference * 15;
    }
  }

  // Community affinity
  if (profile.top_communities.includes(post.community)) {
    score += 25;
  }

  // Creator affinity
  if (profile.top_creators.includes(post.user_id)) {
    score += 30;
  }

  // Add some randomness for exploration (±10%)
  score *= 0.9 + Math.random() * 0.2;

  return score;
};

const enrichPosts = async (
  posts: any[],
  user: { id: string } | null
): Promise<Post[]> => {
  if (!posts || posts.length === 0) return [];

  const userIds = [...new Set(posts.map((p) => p.user_id))];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, avatar_url, allow_nsfw")
    .in("user_id", userIds);

  const profileMap: Record<string, any> = {};
  profiles?.forEach((p) => {
    profileMap[p.user_id] = p;
  });

  // Fetch comment counts (only non-removed comments to match useCommentCount)
  const postIds = posts.map((p) => p.id);
  const { data: commentCounts } = await supabase
    .from("comments")
    .select("post_id")
    .in("post_id", postIds)
    .or("is_removed.is.null,is_removed.eq.false");

  const countMap: Record<string, number> = {};
  commentCounts?.forEach((c) => {
    countMap[c.post_id] = (countMap[c.post_id] || 0) + 1;
  });

  let voteMap: Record<string, number> = {};
  if (user) {
    const { data: votes } = await supabase
      .from("post_votes")
      .select("post_id, vote_type")
      .eq("user_id", user.id);

    votes?.forEach((v) => {
      voteMap[v.post_id] = v.vote_type;
    });
  }

  const flairIds = [...new Set(posts.filter((p) => p.flair_id).map((p) => p.flair_id))];
  let flairMap: Record<string, PostFlair> = {};
  if (flairIds.length > 0) {
    const { data: flairs } = await supabase
      .from("community_flairs")
      .select("id, name, color, background_color")
      .in("id", flairIds);

    flairs?.forEach((f) => {
      flairMap[f.id] = f;
    });
  }

  return posts.map((post) => ({
    ...post,
    author: profileMap[post.user_id] || { username: null, display_name: null, avatar_url: null },
    comment_count: countMap[post.id] || 0,
    user_vote: voteMap[post.id] || null,
    is_locked: post.is_locked ?? false,
    is_pinned: post.is_pinned ?? false,
    is_removed: post.is_removed ?? false,
    flair_id: post.flair_id || null,
    flair: post.flair_id ? flairMap[post.flair_id] || null : null,
    video_url: post.video_url || null,
    video_mime_type: post.video_mime_type || null,
    video_size_bytes: post.video_size_bytes || null,
    video_duration_seconds: post.video_duration_seconds || null,
    poster_image_url: post.poster_image_url || null,
    live_url: post.live_url || null,
    is_nsfw: post.is_nsfw ?? false,
  }));
};

const fetchForYouPage = async (
  user: { id: string } | null,
  allowNsfw: boolean,
  pageParam: number = 0
): Promise<{ posts: Post[]; nextPage: number | null }> => {
  try {
    // Get blocked user IDs
    const blockedIds = user ? await getBlockedUserIds(user.id) : [];

    // Fetch candidate posts (more than we need for scoring)
    const candidateCount = POSTS_PER_PAGE * 3;
    
    let query = supabase
      .from("posts")
      .select("*")
      .or("is_removed.is.null,is_removed.eq.false")
      .order("created_at", { ascending: false })
      .range(pageParam * candidateCount, (pageParam + 1) * candidateCount - 1);

    // Filter NSFW content if not allowed
    if (!allowNsfw) {
      query = query.or("is_nsfw.is.null,is_nsfw.eq.false");
    }

    // Filter out blocked users' posts
    if (blockedIds.length > 0) {
      query = query.not("user_id", "in", `(${blockedIds.join(",")})`);
    }

    const { data: posts, error } = await query;
    if (error) throw error;
    if (!posts || posts.length === 0) return { posts: [], nextPage: null };

    // Get user profile for scoring
    const profile = user ? await fetchUserProfile(user.id) : defaultProfile;
    const nowMs = Date.now();

    // Score and sort posts
    const scoredPosts = posts.map((post) => ({
      post,
      score: scorePost(post, profile, nowMs),
    }));

    scoredPosts.sort((a, b) => b.score - a.score);

    // Take top posts
    const topPosts = scoredPosts.slice(0, POSTS_PER_PAGE).map((s) => s.post);
    const enrichedPosts = await enrichPosts(topPosts, user);

    return {
      posts: enrichedPosts,
      nextPage: posts.length === candidateCount ? pageParam + 1 : null,
    };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("[ForYou] Feed fetch error:", error);
    }
    // Return empty instead of throwing to avoid breaking the UI
    return { posts: [], nextPage: null };
  }
};

export const useForYouFeed = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get user's NSFW preference
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile-nsfw", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("allow_nsfw")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const allowNsfw = userProfile?.allow_nsfw ?? false;

  return useInfiniteQuery({
    queryKey: ["posts", "for-you", "infinite", user?.id, allowNsfw],
    queryFn: ({ pageParam }) => fetchForYouPage(user, allowNsfw, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
};

// Hook to update user feed profile based on recent activity
export const useUpdateFeedProfile = () => {
  const { user } = useAuth();

  const updateProfile = async () => {
    if (!user) return;

    try {
      // Get recent events (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: events } = await supabase
        .from("feed_events")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!events || events.length === 0) return;

      // Calculate stats
      const watchTimeEvents = events.filter((e) => e.event_type === "watch_time");
      const completeEvents = events.filter((e) => e.event_type === "view_complete");
      const viewStartEvents = events.filter((e) => e.event_type === "view_start");

      const avgWatchTimeMs =
        watchTimeEvents.length > 0
          ? watchTimeEvents.reduce((sum, e) => sum + (e.watch_time_ms || 0), 0) / watchTimeEvents.length
          : 0;

      const completionRate =
        viewStartEvents.length > 0 ? completeEvents.length / viewStartEvents.length : 0.5;

      // Get engaged post details for preference calculation
      const engagedPostIds = [...new Set(events.map((e) => e.post_id))];
      const { data: engagedPosts } = await supabase
        .from("posts")
        .select("id, community, user_id, video_duration_seconds")
        .in("id", engagedPostIds);

      // Calculate video length preferences
      let shortCount = 0, midCount = 0, longCount = 0;
      const communityScores: Record<string, number> = {};
      const creatorScores: Record<string, number> = {};

      engagedPosts?.forEach((post) => {
        const duration = post.video_duration_seconds || 0;
        if (duration > 0 && duration <= SHORT_VIDEO_MAX) shortCount++;
        else if (duration >= LONG_VIDEO_MIN) longCount++;
        else if (duration > 0) midCount++;

        communityScores[post.community] = (communityScores[post.community] || 0) + 1;
        creatorScores[post.user_id] = (creatorScores[post.user_id] || 0) + 1;
      });

      const totalVideos = shortCount + midCount + longCount || 1;
      const shortPref = shortCount / totalVideos;
      const midPref = midCount / totalVideos;
      const longPref = longCount / totalVideos;

      const topCommunities = Object.entries(communityScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([c]) => c);

      const topCreators = Object.entries(creatorScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([c]) => c);

      // Upsert profile
      await supabase.from("user_feed_profiles").upsert({
        user_id: user.id,
        avg_watch_time_ms: avgWatchTimeMs,
        completion_rate: completionRate,
        short_video_preference: shortPref || 0.33,
        mid_video_preference: midPref || 0.34,
        long_video_preference: longPref || 0.33,
        top_communities: topCommunities,
        top_creators: topCreators,
        last_computed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to update feed profile:", error);
    }
  };

  return { updateProfile };
};
