import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from './useAuth';

export interface Community {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  created_by: string;
  member_count: number | null;
  created_at: string;
  updated_at: string;
  allow_user_flair?: boolean;
  require_post_flair?: boolean;
}

export interface CommunityRule {
  id: string;
  community_id: string;
  rule_number: number;
  title: string;
  description: string | null;
}

export interface CommunityFlair {
  id: string;
  community_id: string;
  name: string;
  color: string | null;
  background_color: string | null;
  is_mod_only: boolean;
}

export const useCommunities = () => {
  return useQuery({
    queryKey: ['communities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .order('member_count', { ascending: false });

      if (error) throw error;
      return data as Community[];
    },
  });
};

export const useCommunity = (name: string) => {
  return useQuery({
    queryKey: ['community', name],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('name', name)
        .single();

      if (error) throw error;
      return data as Community;
    },
    enabled: !!name,
  });
};

export const useCommunityRules = (communityId: string) => {
  return useQuery({
    queryKey: ['communityRules', communityId],
    queryFn: async () => {
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

export const useCommunityFlairs = (communityId: string) => {
  return useQuery({
    queryKey: ['communityFlairs', communityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_flairs')
        .select('*')
        .eq('community_id', communityId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as CommunityFlair[];
    },
    enabled: !!communityId,
  });
};

export const useIsMember = (communityId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['membership', communityId, user?.id],
    queryFn: async () => {
      if (!user || !communityId) return false;

      const { data } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .maybeSingle();

      return !!data;
    },
    enabled: !!communityId && !!user,
  });
};

export const useJoinCommunity = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (communityId: string) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('community_members')
        .insert({
          community_id: communityId,
          user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership'] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['community'] });
    },
  });
};

export const useLeaveCommunity = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (communityId: string) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership'] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['community'] });
    },
  });
};

export const useUserJoinedCommunities = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['userCommunities', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: memberships } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id);

      if (!memberships?.length) return [];

      const communityIds = memberships.map((m) => m.community_id);
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .in('id', communityIds)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Community[];
    },
    enabled: !!user,
  });
};
