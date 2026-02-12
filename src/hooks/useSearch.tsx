import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Post } from "@/hooks/usePosts";
import { Community } from "@/hooks/useCommunities";
import { useAuth } from "@/hooks/useAuth";
import { getPostsTable, isViewMissingError, markViewMissing, filterPublishedPosts } from "@/lib/postQuery";

interface SearchResults {
  posts: Post[];
  communities: Community[];
}

export const useSearch = (query: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["search", query, user?.id],
    queryFn: async (): Promise<SearchResults> => {
      if (!query || query.length < 2) {
        return { posts: [], communities: [] };
      }

      const searchTerm = `%${query}%`;

      // Search communities
      const { data: communities } = await supabase
        .from("communities")
        .select("*")
        .or(`name.ilike.${searchTerm},display_name.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .limit(10);

      // Search posts with resilient view fallback
      const buildQuery = (table: string) => supabase
        .from(table as any)
        .select("*")
        .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
        .order("created_at", { ascending: false })
        .limit(20);

      let result = await buildQuery(getPostsTable());
      if (result.error && isViewMissingError(result.error)) {
        markViewMissing();
        result = await buildQuery(getPostsTable());
      }
      const posts: any[] = filterPublishedPosts(result.data || []);

      if (!posts || posts.length === 0) {
        return { posts: [], communities: communities || [] };
      }

      // Get profiles for posts
      const userIds = [...new Set(posts.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap: Record<string, { username: string | null; display_name: string | null; avatar_url: string | null }> = {};
      profiles?.forEach((p) => {
        profileMap[p.user_id] = { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url };
      });

      // Get comment counts
      const postIds = posts.map((p) => p.id);
      const { data: commentCounts } = await supabase
        .from("comments")
        .select("post_id")
        .in("post_id", postIds);

      const countMap: Record<string, number> = {};
      commentCounts?.forEach((c) => {
        countMap[c.post_id] = (countMap[c.post_id] || 0) + 1;
      });

      // Get user votes if logged in
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

      // Get flairs
      const flairIds = [...new Set(posts.filter(p => p.flair_id).map(p => p.flair_id))];
      let flairMap: Record<string, { id: string; name: string; color: string; background_color: string }> = {};
      if (flairIds.length > 0) {
        const { data: flairs } = await supabase
          .from("community_flairs")
          .select("id, name, color, background_color")
          .in("id", flairIds);

        flairs?.forEach((f) => {
          flairMap[f.id] = f;
        });
      }

      const enrichedPosts = posts.map((post) => ({
        ...post,
        author: profileMap[post.user_id] || { username: null, display_name: null, avatar_url: null },
        comment_count: countMap[post.id] || 0,
        user_vote: voteMap[post.id] || null,
        is_locked: post.is_locked ?? false,
        is_pinned: post.is_pinned ?? false,
        is_removed: post.is_removed ?? false,
        flair_id: post.flair_id || null,
        flair: post.flair_id ? flairMap[post.flair_id] || null : null,
      }));

      return {
        posts: enrichedPosts,
        communities: communities || [],
      };
    },
    enabled: query.length >= 2,
  });
};
