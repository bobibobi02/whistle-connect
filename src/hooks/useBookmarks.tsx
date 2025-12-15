import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Post } from "@/hooks/usePosts";

export const useBookmarks = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["bookmarks", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("bookmarks")
        .select("post_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map((b) => b.post_id);
    },
    enabled: !!user,
  });
};

export const useBookmarkedPosts = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["bookmarked-posts", user?.id],
    queryFn: async (): Promise<Post[]> => {
      if (!user) return [];

      // Get bookmarked post IDs
      const { data: bookmarks, error: bookmarksError } = await supabase
        .from("bookmarks")
        .select("post_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (bookmarksError) throw bookmarksError;
      if (!bookmarks || bookmarks.length === 0) return [];

      const postIds = bookmarks.map((b) => b.post_id);

      // Fetch posts
      const { data: posts, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .in("id", postIds);

      if (postsError) throw postsError;
      if (!posts || posts.length === 0) return [];

      // Get profiles
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
      const { data: commentCounts } = await supabase
        .from("comments")
        .select("post_id")
        .in("post_id", postIds);

      const countMap: Record<string, number> = {};
      commentCounts?.forEach((c) => {
        countMap[c.post_id] = (countMap[c.post_id] || 0) + 1;
      });

      // Get user votes
      const { data: votes } = await supabase
        .from("post_votes")
        .select("post_id, vote_type")
        .eq("user_id", user.id);

      const voteMap: Record<string, number> = {};
      votes?.forEach((v) => {
        voteMap[v.post_id] = v.vote_type;
      });

      // Sort by bookmark order
      const sortedPosts = postIds
        .map((id) => posts.find((p) => p.id === id))
        .filter(Boolean) as typeof posts;

      return sortedPosts.map((post) => ({
        ...post,
        author: profileMap[post.user_id] || { username: null, display_name: null, avatar_url: null },
        comment_count: countMap[post.id] || 0,
        user_vote: voteMap[post.id] || null,
      }));
    },
    enabled: !!user,
  });
};

export const useToggleBookmark = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ postId, isBookmarked }: { postId: string; isBookmarked: boolean }) => {
      if (!user) throw new Error("Not authenticated");

      if (isBookmarked) {
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", postId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("bookmarks")
          .insert({ user_id: user.id, post_id: postId });

        if (error) throw error;
      }

      return !isBookmarked;
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarked-posts"] });
      toast({
        title: saved ? "Post saved" : "Post unsaved",
        description: saved ? "Added to your saved posts" : "Removed from saved posts",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
