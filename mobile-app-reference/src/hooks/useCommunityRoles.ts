import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from './useAuth';

export type CommunityRole = 'owner' | 'moderator' | 'member' | 'banned' | 'muted';

export interface CommunityRoleRecord {
  id: string;
  community_id: string;
  user_id: string;
  role: CommunityRole;
  reason: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const useCommunityRoles = (communityId: string | undefined) => {
  return useQuery({
    queryKey: ['community-roles', communityId],
    queryFn: async () => {
      if (!communityId) return [];

      const { data, error } = await supabase
        .from('community_roles')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for users
      const userIds = [...new Set(data.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      return data.map((role) => ({
        ...role,
        role: role.role as CommunityRole,
        profile: profileMap.get(role.user_id) || null,
      })) as CommunityRoleRecord[];
    },
    enabled: !!communityId,
  });
};

export const useUserCommunityRole = (communityId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-community-role', communityId, user?.id],
    queryFn: async () => {
      if (!communityId || !user) return null;

      const { data, error } = await supabase
        .from('community_roles')
        .select('*')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data ? (data.role as CommunityRole) : null;
    },
    enabled: !!communityId && !!user,
  });
};

export const useIsCommunityMod = (communityId: string | undefined) => {
  const { data: role, isLoading } = useUserCommunityRole(communityId);

  return {
    isMod: role === 'owner' || role === 'moderator',
    isOwner: role === 'owner',
    isLoading,
  };
};

export const useAssignCommunityRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      communityId,
      userId,
      role,
      reason,
      expiresAt,
    }: {
      communityId: string;
      userId: string;
      role: CommunityRole;
      reason?: string;
      expiresAt?: string;
    }) => {
      // Check if role already exists
      const { data: existing } = await supabase
        .from('community_roles')
        .select('id')
        .eq('community_id', communityId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('community_roles')
          .update({
            role,
            reason: reason || null,
            expires_at: expiresAt || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('community_roles').insert({
          community_id: communityId,
          user_id: userId,
          role,
          reason: reason || null,
          expires_at: expiresAt || null,
        });

        if (error) throw error;
      }
    },
    onSuccess: (_, { communityId }) => {
      queryClient.invalidateQueries({ queryKey: ['community-roles', communityId] });
      queryClient.invalidateQueries({ queryKey: ['user-community-role', communityId] });
    },
  });
};

export const useRemoveCommunityRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      communityId,
      userId,
    }: {
      communityId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from('community_roles')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, { communityId }) => {
      queryClient.invalidateQueries({ queryKey: ['community-roles', communityId] });
      queryClient.invalidateQueries({ queryKey: ['user-community-role', communityId] });
    },
  });
};
