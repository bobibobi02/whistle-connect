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
        // Remove vote
        await supabase
          .from('post_votes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        // Upsert vote
        await supabase.from('post_votes').upsert(
          {
            post_id: postId,
            user_id: user.id,
            vote_type: voteType,
          },
          { onConflict: 'post_id,user_id' }
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post'] });
    },
  });

  const voteOnComment = useMutation({
    mutationFn: async ({
      commentId,
      voteType,
    }: {
      commentId: string;
      voteType: 1 | -1 | 0;
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });

  return { voteOnPost, voteOnComment };
};
