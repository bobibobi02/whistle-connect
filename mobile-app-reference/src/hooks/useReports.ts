import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from './useAuth';

export interface Report {
  id: string;
  reporter_id: string;
  content_type: 'post' | 'comment';
  post_id: string | null;
  comment_id: string | null;
  reason: string;
  details: string | null;
  status: 'pending' | 'reviewed' | 'dismissed';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export const useReports = (status?: string) => {
  return useQuery({
    queryKey: ['reports', status],
    queryFn: async () => {
      let query = supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Report[];
    },
  });
};

export const useMyReports = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-reports', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('reporter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Report[];
    },
    enabled: !!user,
  });
};

export const useCreateReport = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      contentType,
      postId,
      commentId,
      reason,
      details,
    }: {
      contentType: 'post' | 'comment';
      postId?: string;
      commentId?: string;
      reason: string;
      details?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('reports')
        .insert({
          reporter_id: user.id,
          content_type: contentType,
          post_id: postId || null,
          comment_id: commentId || null,
          reason,
          details: details || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['my-reports'] });
    },
  });
};

export const useResolveReport = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      reportId,
      status,
    }: {
      reportId: string;
      status: 'reviewed' | 'dismissed';
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('reports')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};
