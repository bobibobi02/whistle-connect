import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from './useAuth';

export interface CommunityRule {
  id: string;
  community_id: string;
  rule_number: number;
  title: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useCommunityRules = (communityId: string | undefined) => {
  return useQuery({
    queryKey: ['community-rules', communityId],
    queryFn: async () => {
      if (!communityId) return [];

      const { data, error } = await supabase
        .from('community_rules')
        .select('*')
        .eq('community_id', communityId)
        .order('rule_number', { ascending: true });

      if (error) throw error;
      return data as CommunityRule[];
    },
    enabled: !!communityId,
  });
};

export const useCreateCommunityRule = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      communityId,
      title,
      description,
      ruleNumber,
    }: {
      communityId: string;
      title: string;
      description?: string;
      ruleNumber: number;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('community_rules')
        .insert({
          community_id: communityId,
          title,
          description: description || null,
          rule_number: ruleNumber,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { communityId }) => {
      queryClient.invalidateQueries({ queryKey: ['community-rules', communityId] });
    },
  });
};

export const useUpdateCommunityRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ruleId,
      communityId,
      title,
      description,
      ruleNumber,
    }: {
      ruleId: string;
      communityId: string;
      title?: string;
      description?: string;
      ruleNumber?: number;
    }) => {
      const updates: Partial<CommunityRule> = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (ruleNumber !== undefined) updates.rule_number = ruleNumber;

      const { error } = await supabase
        .from('community_rules')
        .update(updates)
        .eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: (_, { communityId }) => {
      queryClient.invalidateQueries({ queryKey: ['community-rules', communityId] });
    },
  });
};

export const useDeleteCommunityRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ruleId,
      communityId,
    }: {
      ruleId: string;
      communityId: string;
    }) => {
      const { error } = await supabase
        .from('community_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: (_, { communityId }) => {
      queryClient.invalidateQueries({ queryKey: ['community-rules', communityId] });
    },
  });
};
