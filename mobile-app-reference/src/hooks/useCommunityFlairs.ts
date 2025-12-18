import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from './useAuth';

export interface CommunityFlair {
  id: string;
  community_id: string;
  name: string;
  color: string;
  background_color: string;
  is_mod_only: boolean;
  created_at: string;
}

export interface CommunityUserFlair {
  id: string;
  community_id: string;
  user_id: string;
  flair_text: string | null;
  flair_color: string;
  created_at: string;
  updated_at: string;
}

export const useCommunityFlairs = (communityId: string | undefined) => {
  return useQuery({
    queryKey: ['community-flairs', communityId],
    queryFn: async () => {
      if (!communityId) return [];

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

export const useUserCommunityFlair = (communityId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-community-flair', communityId, user?.id],
    queryFn: async () => {
      if (!communityId || !user) return null;

      const { data, error } = await supabase
        .from('community_user_flairs')
        .select('*')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as CommunityUserFlair | null;
    },
    enabled: !!communityId && !!user,
  });
};

export const useSetUserFlair = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      communityId,
      flairText,
      flairColor,
    }: {
      communityId: string;
      flairText: string;
      flairColor?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Check if flair already exists
      const { data: existing } = await supabase
        .from('community_user_flairs')
        .select('id')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('community_user_flairs')
          .update({
            flair_text: flairText,
            flair_color: flairColor || '#34D399',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('community_user_flairs').insert({
          community_id: communityId,
          user_id: user.id,
          flair_text: flairText,
          flair_color: flairColor || '#34D399',
        });

        if (error) throw error;
      }
    },
    onSuccess: (_, { communityId }) => {
      queryClient.invalidateQueries({ queryKey: ['user-community-flair', communityId] });
    },
  });
};

export const useRemoveUserFlair = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (communityId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('community_user_flairs')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, communityId) => {
      queryClient.invalidateQueries({ queryKey: ['user-community-flair', communityId] });
    },
  });
};

// Mod-only: Create post flairs
export const useCreateCommunityFlair = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      communityId,
      name,
      color,
      backgroundColor,
      isModOnly,
    }: {
      communityId: string;
      name: string;
      color?: string;
      backgroundColor?: string;
      isModOnly?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('community_flairs')
        .insert({
          community_id: communityId,
          name,
          color: color || '#FF5C7A',
          background_color: backgroundColor || '#1E1A18',
          is_mod_only: isModOnly || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { communityId }) => {
      queryClient.invalidateQueries({ queryKey: ['community-flairs', communityId] });
    },
  });
};

export const useDeleteCommunityFlair = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      flairId,
      communityId,
    }: {
      flairId: string;
      communityId: string;
    }) => {
      const { error } = await supabase
        .from('community_flairs')
        .delete()
        .eq('id', flairId);

      if (error) throw error;
    },
    onSuccess: (_, { communityId }) => {
      queryClient.invalidateQueries({ queryKey: ['community-flairs', communityId] });
    },
  });
};
