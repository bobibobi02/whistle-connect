import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { createMentionNotifications } from "@/hooks/useMentionNotifications";

// Helper to count total comments including nested replies
export const countTotalComments = (commentList: Comment[] | undefined): number => {
  if (!commentList) return 0;
  let count = 0;
  const countRecursive = (items: Comment[]) => {
    for (const item of items) {
      count++;
      if (item.replies && item.replies.length > 0) {
        countRecursive(item.replies);
      }
    }
  };
  countRecursive(commentList);
  return count;
};

// Lightweight hook to fetch only comment count (not full comments)
// This now filters out removed comments to match what PostDetail displays
export const useCommentCount = (postId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["comment-count", postId],
    queryFn: async (): Promise<number> => {
      // Count only non-removed comments to match what PostDetail displays
      const { count, error } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId)
        .or("is_removed.is.null,is_removed.eq.false");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!postId,
    staleTime: 5000, // Shorter stale time for more responsive updates
  });

  // Real-time subscription for comment count updates
  useEffect(() => {
    if (!postId) return;

    const channel = supabase
      .channel(`comment-count-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        () => {
          // Invalidate count when any comment changes for this post
          queryClient.invalidateQueries({ queryKey: ["comment-count", postId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, queryClient]);

  return query;
};

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  upvotes: number;
  created_at: string;
  boost_id: string | null;
  boost_amount_cents?: number | null;
  boost_currency?: string | null;
  is_removed?: boolean | null;
  removal_reason?: string | null;
  author: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  user_vote: number | null;
  replies?: Comment[];
}

export const useComments = (postId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["comments", postId, user?.id],
    queryFn: async (): Promise<Comment[]> => {
      // Filter out removed comments to match the count
      const { data: comments, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .or("is_removed.is.null,is_removed.eq.false")
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!comments || comments.length === 0) return [];

      // Get unique user IDs and boost IDs
      const userIds = [...new Set(comments.map(c => c.user_id))];
      const boostIds = comments.filter(c => c.boost_id).map(c => c.boost_id!);
      
      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap: Record<string, { username: string | null; display_name: string | null; avatar_url: string | null }> = {};
      profiles?.forEach(p => {
        profileMap[p.user_id] = { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url };
      });

      // Fetch boost amounts if there are any boost comments
      let boostMap: Record<string, { amount_cents: number; currency: string }> = {};
      if (boostIds.length > 0) {
        const { data: boosts } = await supabase
          .from("post_boosts")
          .select("id, amount_cents, currency")
          .in("id", boostIds);
        
        boosts?.forEach(b => {
          boostMap[b.id] = { amount_cents: b.amount_cents, currency: b.currency };
        });
      }

      // Fetch user votes if logged in
      let voteMap: Record<string, number> = {};
      if (user) {
        const commentIds = comments.map(c => c.id);
        const { data: votes } = await supabase
          .from("comment_votes")
          .select("comment_id, vote_type")
          .in("comment_id", commentIds);

        votes?.forEach(v => {
          voteMap[v.comment_id] = v.vote_type;
        });
      }

      const commentsWithData = comments.map(comment => {
        const boostData = comment.boost_id ? boostMap[comment.boost_id] : null;
        return {
          ...comment,
          author: profileMap[comment.user_id] || { username: null, display_name: null, avatar_url: null },
          user_vote: voteMap[comment.id] || null,
          boost_amount_cents: boostData?.amount_cents || null,
          boost_currency: boostData?.currency || null,
        };
      });

      // Build nested structure
      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      commentsWithData.forEach(comment => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });

      commentsWithData.forEach(comment => {
        const commentWithReplies = commentMap.get(comment.id)!;
        if (comment.parent_id) {
          const parent = commentMap.get(comment.parent_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(commentWithReplies);
          } else {
            rootComments.push(commentWithReplies);
          }
        } else {
          rootComments.push(commentWithReplies);
        }
      });

      return rootComments;
    },
    enabled: !!postId,
  });

  // Real-time subscription for comments updates
  useEffect(() => {
    if (!postId) return;

    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        () => {
          // Invalidate comments when any change occurs
          queryClient.invalidateQueries({ queryKey: ["comments", postId] });
          // Also update the comment count
          queryClient.invalidateQueries({ queryKey: ["comment-count", postId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, queryClient]);

  return query;
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      postId,
      content,
      parentId,
    }: {
      postId: string;
      content: string;
      parentId?: string;
    }) => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Not authenticated");

      // Moderate content before posting
      const { data: moderationResult } = await supabase.functions.invoke('moderate-content', {
        body: { content, type: 'comment', userId: authUser.id }
      });

      if (moderationResult?.allowed === false) {
        throw new Error(moderationResult.reason || 'Your comment was flagged for violating community guidelines.');
      }

      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: authUser.id,
          content,
          parent_id: parentId || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Create mention notifications for any @mentions in the comment
      if (data && content) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("user_id", authUser.id)
          .single();

        await createMentionNotifications({
          content,
          authorId: authUser.id,
          authorUsername: profile?.username || null,
          postId,
          commentId: data.id,
          contentType: "comment",
        });
      }

      return { ...data, postId };
    },
    // Optimistic update: immediately add the comment to the cache
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["comments", variables.postId] });
      
      // Snapshot the previous value
      const previousComments = queryClient.getQueryData<Comment[]>(["comments", variables.postId, user?.id]);
      
      // Optimistically update the cache with a temporary comment
      if (previousComments && user) {
        const optimisticComment: Comment = {
          id: `temp-${Date.now()}`,
          post_id: variables.postId,
          user_id: user.id,
          parent_id: variables.parentId || null,
          content: variables.content,
          upvotes: 0,
          created_at: new Date().toISOString(),
          boost_id: null,
          author: { username: null, display_name: "You", avatar_url: null },
          user_vote: null,
          replies: [],
        };

        if (variables.parentId) {
          // Add as a reply to parent
          const addReplyToParent = (comments: Comment[]): Comment[] => {
            return comments.map(c => {
              if (c.id === variables.parentId) {
                return { ...c, replies: [...(c.replies || []), optimisticComment] };
              }
              if (c.replies && c.replies.length > 0) {
                return { ...c, replies: addReplyToParent(c.replies) };
              }
              return c;
            });
          };
          queryClient.setQueryData<Comment[]>(
            ["comments", variables.postId, user?.id],
            addReplyToParent(previousComments)
          );
        } else {
          // Add as root comment
          queryClient.setQueryData<Comment[]>(
            ["comments", variables.postId, user?.id],
            [...previousComments, optimisticComment]
          );
        }
      }

      return { previousComments };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousComments) {
        queryClient.setQueryData(["comments", variables.postId, user?.id], context.previousComments);
      }
      toast({
        title: "Error posting comment",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      // Refetch to get the real data with proper IDs
      queryClient.invalidateQueries({ queryKey: ["comments", data.postId] });
      queryClient.invalidateQueries({ queryKey: ["comment-count", data.postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", data.postId] });
      toast({ title: "Comment posted!" });
    },
  });
};

export const useVoteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, postId, voteType }: { commentId: string; postId: string; voteType: 1 | -1 | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (voteType === null) {
        await supabase
          .from("comment_votes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
      } else {
        const { error } = await supabase
          .from("comment_votes")
          .upsert(
            { comment_id: commentId, user_id: user.id, vote_type: voteType },
            { onConflict: "comment_id,user_id" }
          );
        if (error) throw error;
      }

      // Update comment upvotes count
      const { data: votes } = await supabase
        .from("comment_votes")
        .select("vote_type")
        .eq("comment_id", commentId);

      const totalVotes = votes?.reduce((sum, v) => sum + v.vote_type, 0) || 0;

      await supabase
        .from("comments")
        .update({ upvotes: totalVotes })
        .eq("id", commentId);

      return postId;
    },
    onSuccess: (postId) => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ commentId, postId }: { commentId: string; postId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id);

      if (error) throw error;
      return postId;
    },
    onSuccess: (postId) => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["comment-count", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast({ title: "Comment deleted" });
    },
    onError: (error) => {
      toast({
        title: "Error deleting comment",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
