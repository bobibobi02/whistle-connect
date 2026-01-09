import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface CreateReportParams {
  contentType: 'post' | 'comment';
  postId?: string;
  commentId?: string;
  reason: string;
  details?: string;
}

export const useCreateReport = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contentType, postId, commentId, reason, details }: CreateReportParams) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        content_type: contentType,
        post_id: postId || null,
        comment_id: commentId || null,
        reason,
        details: details || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};
