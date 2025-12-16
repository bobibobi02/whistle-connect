import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  community: string;
  community_icon: string | null;
  upvotes: number;
  created_at: string;
  author: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  comment_count: number;
  user_vote: number | null;
}

export type SortOption = "best" | "hot" | "new";

const POSTS_PER_PAGE = 10;

const enrichPosts = async (
  posts: any[],
  user: { id: string } | null,
  sort: SortOption
): Promise<Post[]> => {
  if (!posts || posts.length === 0) return [];

  // For "hot" sorting, we'll do additional client-side sorting
  let sortedPosts = posts;
  if (sort === "hot") {
    const now = Date.now();
    const hourInMs = 3600000;
    sortedPosts = [...posts].sort((a, b) => {
      const ageA = (now - new Date(a.created_at).getTime()) / hourInMs;
      const ageB = (now - new Date(b.created_at).getTime()) / hourInMs;
      const scoreA = a.upvotes / Math.pow(ageA + 2, 1.5);
      const scoreB = b.upvotes / Math.pow(ageB + 2, 1.5);
      return scoreB - scoreA;
    });
  }

  // Get unique user IDs
  const userIds = [...new Set(sortedPosts.map((p) => p.user_id))];

  // Fetch profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, avatar_url")
    .in("user_id", userIds);

  const profileMap: Record<string, { username: string | null; display_name: string | null; avatar_url: string | null }> = {};
  profiles?.forEach((p) => {
    profileMap[p.user_id] = { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url };
  });

  // Fetch comment counts
  const postIds = sortedPosts.map((p) => p.id);
  const { data: commentCounts } = await supabase
    .from("comments")
    .select("post_id")
    .in("post_id", postIds);

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

  return sortedPosts.map((post) => ({
    ...post,
    author: profileMap[post.user_id] || { username: null, display_name: null, avatar_url: null },
    comment_count: countMap[post.id] || 0,
    user_vote: voteMap[post.id] || null,
  }));
};

const fetchPostsPage = async (
  user: { id: string } | null,
  sort: SortOption = "best",
  pageParam: number = 0,
  community?: string
): Promise<{ posts: Post[]; nextPage: number | null }> => {
  let query = supabase.from("posts").select("*");

  if (community) {
    query = query.eq("community", community);
  }

  // Apply sorting
  if (sort === "new") {
    query = query.order("created_at", { ascending: false });
  } else if (sort === "hot") {
    query = query.order("created_at", { ascending: false }).order("upvotes", { ascending: false });
  } else {
    query = query.order("upvotes", { ascending: false }).order("created_at", { ascending: false });
  }

  // Apply pagination
  query = query.range(pageParam * POSTS_PER_PAGE, (pageParam + 1) * POSTS_PER_PAGE - 1);

  const { data: posts, error } = await query;

  if (error) throw error;

  const enrichedPosts = await enrichPosts(posts || [], user, sort);

  return {
    posts: enrichedPosts,
    nextPage: posts && posts.length === POSTS_PER_PAGE ? pageParam + 1 : null,
  };
};

export const useInfinitePosts = (sort: SortOption = "best") => {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ["posts", "infinite", sort, user?.id],
    queryFn: ({ pageParam }) => fetchPostsPage(user, sort, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
};

export const usePosts = (sort: SortOption = "best") => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["posts", sort, user?.id],
    queryFn: async () => {
      const result = await fetchPostsPage(user, sort, 0);
      return result.posts;
    },
  });
};

export const useJoinedCommunityPosts = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["posts", "joined", user?.id],
    queryFn: async (): Promise<Post[]> => {
      if (!user) return [];

      // Get user's joined communities
      const { data: memberships } = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", user.id);

      if (!memberships || memberships.length === 0) return [];

      const communityIds = memberships.map((m) => m.community_id);

      // Get community names from IDs
      const { data: communities } = await supabase
        .from("communities")
        .select("name")
        .in("id", communityIds);

      if (!communities || communities.length === 0) return [];

      const communityNames = communities.map((c) => c.name);

      // Fetch posts from joined communities
      const { data: posts, error } = await supabase
        .from("posts")
        .select("*")
        .in("community", communityNames)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!posts || posts.length === 0) return [];

      return enrichPosts(posts, user, "new");
    },
    enabled: !!user,
  });
};

export const useFollowingPosts = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["posts", "following", user?.id],
    queryFn: async (): Promise<Post[]> => {
      if (!user) return [];

      // Get users that the current user follows
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (!follows || follows.length === 0) return [];

      const followingIds = follows.map((f) => f.following_id);

      // Fetch posts from followed users
      const { data: posts, error } = await supabase
        .from("posts")
        .select("*")
        .in("user_id", followingIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!posts || posts.length === 0) return [];

      return enrichPosts(posts, user, "new");
    },
    enabled: !!user,
  });
};

export const useCommunityPosts = (community: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["posts", "community", community, user?.id],
    queryFn: async () => {
      const result = await fetchPostsPage(user, "new", 0, community);
      return result.posts;
    },
    enabled: !!community,
  });
};

export const usePost = (postId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["post", postId, user?.id],
    queryFn: async (): Promise<Post | null> => {
      const { data: post, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .maybeSingle();

      if (error) throw error;
      if (!post) return null;

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("user_id", post.user_id)
        .maybeSingle();

      // Fetch comment count
      const { count } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

      // Fetch user vote
      let userVote: number | null = null;
      if (user) {
        const { data: vote } = await supabase
          .from("post_votes")
          .select("vote_type")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .maybeSingle();
        userVote = vote?.vote_type || null;
      }

      return {
        ...post,
        author: profile || { username: null, display_name: null, avatar_url: null },
        comment_count: count || 0,
        user_vote: userVote,
      };
    },
    enabled: !!postId,
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      title,
      content,
      image_url,
      community,
      community_icon,
    }: {
      title: string;
      content?: string;
      image_url?: string;
      community?: string;
      community_icon?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Moderate content before posting
      const textToModerate = `${title}\n${content || ''}`;
      const { data: moderationResult } = await supabase.functions.invoke('moderate-content', {
        body: { content: textToModerate, type: 'post' }
      });

      if (moderationResult?.allowed === false) {
        throw new Error(moderationResult.reason || 'Your post was flagged for violating community guidelines.');
      }

      const { data, error } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          title,
          content: content || null,
          image_url: image_url || null,
          community: community || "general",
          community_icon: community_icon || "💬",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast({ title: "Post created!", description: "Your post is now live." });
    },
    onError: (error) => {
      toast({
        title: "Error creating post",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useVotePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, voteType }: { postId: string; voteType: 1 | -1 | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (voteType === null) {
        await supabase
          .from("post_votes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        const { error } = await supabase
          .from("post_votes")
          .upsert(
            { post_id: postId, user_id: user.id, vote_type: voteType },
            { onConflict: "post_id,user_id" }
          );
        if (error) throw error;
      }

      // Update post upvotes count
      const { data: votes } = await supabase
        .from("post_votes")
        .select("vote_type")
        .eq("post_id", postId);

      const totalVotes = votes?.reduce((sum, v) => sum + v.vote_type, 0) || 0;

      await supabase
        .from("posts")
        .update({ upvotes: totalVotes })
        .eq("id", postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post"] });
    },
  });
};
