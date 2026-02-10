import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Post, PostFlair, getBlockedUserIds } from "@/hooks/usePosts";

const POSTS_PER_PAGE = 10;

const enrichLivePosts = async (
  posts: any[],
  user: { id: string } | null
): Promise<Post[]> => {
  if (!posts || posts.length === 0) return [];

  // Get unique user IDs
  const userIds = [...new Set(posts.map((p) => p.user_id))];

  // Fetch profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, avatar_url")
    .in("user_id", userIds);

  const profileMap: Record<string, { username: string | null; display_name: string | null; avatar_url: string | null }> = {};
  profiles?.forEach((p) => {
    profileMap[p.user_id] = { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url };
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

  // Fetch user votes if logged in
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

  // Fetch flairs for posts that have flair_id
  const flairIds = [...new Set(posts.filter(p => p.flair_id).map(p => p.flair_id))];
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
  }));
};

const fetchLivePostsPage = async (
  user: { id: string } | null,
  pageParam: number = 0
): Promise<{ posts: Post[]; nextPage: number | null }> => {
  // Get blocked user IDs
  const blockedIds = user ? await getBlockedUserIds(user.id) : [];

  let query = supabase
    .from("public_posts")
    .select("*")
    .not("live_url", "is", null)
    .order("created_at", { ascending: false })
    .range(pageParam * POSTS_PER_PAGE, (pageParam + 1) * POSTS_PER_PAGE - 1);

  // Filter out blocked users' posts
  if (blockedIds.length > 0) {
    query = query.not("user_id", "in", `(${blockedIds.join(",")})`);
  }

  const { data: posts, error } = await query;

  if (error) throw error;

  const enrichedPosts = await enrichLivePosts(posts || [], user);

  return {
    posts: enrichedPosts,
    nextPage: posts && posts.length === POSTS_PER_PAGE ? pageParam + 1 : null,
  };
};

export const useLivePosts = () => {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ["posts", "live", user?.id],
    queryFn: ({ pageParam }) => fetchLivePostsPage(user, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });
};
