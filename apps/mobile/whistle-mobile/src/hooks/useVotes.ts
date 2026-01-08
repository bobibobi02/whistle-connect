import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export const useVotes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const voteOnPost = useMutation({
    mutationFn: async ({
      postId,
      voteType,
    }: {
      postId: string;
      voteType: 1 | -1 | 0;
    }) => {
      if (!user) throw new Error('Not authenticated');

      if (voteType === 0) {
        await supabase
          .from('post_votes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase.from('post_votes').upsert(
          {
            post_id: postId,
            user_id: user.id,
            vote_type: voteType,
          },
          { onConflict: 'post_id,user_id' }
        );
      }
      return { postId, voteType };
    },
    onMutate: async ({ postId, voteType }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      await queryClient.cancelQueries({ queryKey: ['post', postId] });

      // Snapshot previous values
      const previousPost = queryClient.getQueryData(['post', postId]);
      const previousPosts = queryClient.getQueryData(['posts']);

      // Optimistically update single post
      queryClient.setQueryData(['post', postId], (old: any) => {
        if (!old) return old;
        const oldVote = old.user_vote || 0;
        const voteDiff = voteType - oldVote;
        return {
          ...old,
          user_vote: voteType === 0 ? null : voteType,
          upvotes: old.upvotes + voteDiff,
        };
      });

      // Optimistically update posts in infinite query
      queryClient.setQueriesData({ queryKey: ['posts'] }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((post: any) => {
              if (post.id !== postId) return post;
              const oldVote = post.user_vote || 0;
              const voteDiff = voteType - oldVote;
              return {
                ...post,
                user_vote: voteType === 0 ? null : voteType,
                upvotes: post.upvotes + voteDiff,
              };
            }),
          })),
        };
      });

      return { previousPost, previousPosts };
    },
    onError: (_err, { postId }, context) => {
      // Rollback on error
      if (context?.previousPost) {
        queryClient.setQueryData(['post', postId], context.previousPost);
      }
      if (context?.previousPosts) {
        queryClient.setQueryData(['posts'], context.previousPosts);
      }
    },
    onSettled: (_, __, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });

  const voteOnComment = useMutation({
    mutationFn: async ({
      commentId,
      voteType,
      postId,
    }: {
      commentId: string;
      voteType: 1 | -1 | 0;
      postId: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      if (voteType === 0) {
        await supabase
          .from('comment_votes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
      } else {
        await supabase.from('comment_votes').upsert(
          {
            comment_id: commentId,
            user_id: user.id,
            vote_type: voteType,
          },
          { onConflict: 'comment_id,user_id' }
        );
      }
      return { commentId, voteType, postId };
    },
    onMutate: async ({ commentId, voteType, postId }) => {
      await queryClient.cancelQueries({ queryKey: ['comments', postId] });

      const previousComments = queryClient.getQueryData(['comments', postId]);

      // Helper to update comment tree recursively
      const updateCommentVote = (comments: any[]): any[] => {
        return comments.map((comment) => {
          if (comment.id === commentId) {
            const oldVote = comment.user_vote || 0;
            const voteDiff = voteType - oldVote;
            return {
              ...comment,
              user_vote: voteType === 0 ? 0 : voteType,
              upvotes: comment.upvotes + voteDiff,
            };
          }
          if (comment.replies?.length) {
            return { ...comment, replies: updateCommentVote(comment.replies) };
          }
          return comment;
        });
      };

      queryClient.setQueryData(['comments', postId], (old: any) => {
        if (!old) return old;
        return updateCommentVote(old);
      });

      return { previousComments };
    },
    onError: (_err, { postId }, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(['comments', postId], context.previousComments);
      }
    },
    onSettled: (_, __, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
  });

  return { voteOnPost, voteOnComment };
};
