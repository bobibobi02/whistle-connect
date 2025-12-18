import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from './useAuth';

export const usePostVote = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      postId,
      voteType,
    }: {
      postId: string;
      voteType: 1 | -1;
    }) => {
      if (!user) throw new Error('Must be logged in');

      // Check existing vote
      const { data: existingVote } = await supabase
        .from('post_votes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote if same type
          await supabase
            .from('post_votes')
            .delete()
            .eq('id', existingVote.id);

          // Update post upvotes
          await supabase.rpc('increment_post_votes', {
            post_id: postId,
            amount: -voteType,
          }).catch(() => {
            // Fallback: direct update
            supabase
              .from('posts')
              .update({ upvotes: supabase.rpc('raw', `upvotes - ${voteType}`) })
              .eq('id', postId);
          });
        } else {
          // Change vote
          await supabase
            .from('post_votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);

          // Update post upvotes (difference is 2x)
          await supabase
            .from('posts')
            .update({ upvotes: existingVote.vote_type === 1 ? -2 : 2 })
            .eq('id', postId);
        }
      } else {
        // New vote
        await supabase.from('post_votes').insert({
          post_id: postId,
          user_id: user.id,
          vote_type: voteType,
        });

        // Update post upvotes
        const { data: post } = await supabase
          .from('posts')
          .select('upvotes')
          .eq('id', postId)
          .single();

        if (post) {
          await supabase
            .from('posts')
            .update({ upvotes: post.upvotes + voteType })
            .eq('id', postId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post'] });
    },
  });
};

export const useCommentVote = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      commentId,
      postId,
      voteType,
    }: {
      commentId: string;
      postId: string;
      voteType: 1 | -1;
    }) => {
      if (!user) throw new Error('Must be logged in');

      const { data: existingVote } = await supabase
        .from('comment_votes')
        .select('*')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          await supabase
            .from('comment_votes')
            .delete()
            .eq('id', existingVote.id);

          const { data: comment } = await supabase
            .from('comments')
            .select('upvotes')
            .eq('id', commentId)
            .single();

          if (comment) {
            await supabase
              .from('comments')
              .update({ upvotes: comment.upvotes - voteType })
              .eq('id', commentId);
          }
        } else {
          await supabase
            .from('comment_votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);

          const { data: comment } = await supabase
            .from('comments')
            .select('upvotes')
            .eq('id', commentId)
            .single();

          if (comment) {
            await supabase
              .from('comments')
              .update({ upvotes: comment.upvotes + (voteType * 2) })
              .eq('id', commentId);
          }
        }
      } else {
        await supabase.from('comment_votes').insert({
          comment_id: commentId,
          user_id: user.id,
          vote_type: voteType,
        });

        const { data: comment } = await supabase
          .from('comments')
          .select('upvotes')
          .eq('id', commentId)
          .single();

        if (comment) {
          await supabase
            .from('comments')
            .update({ upvotes: comment.upvotes + voteType })
            .eq('id', commentId);
        }
      }

      return { postId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['comments', data.postId] });
    },
  });
};
