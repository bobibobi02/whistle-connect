import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from './useAuth';

export interface UserBan {
  id: string;
  user_id: string;
  banned_by: string;
  reason: string;
  is_permanent: boolean;
  expires_at: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  created_at: string;
}

export const useUserBans = () => {
  return useQuery({
    queryKey: ['user-bans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_bans')
        .select('*')
        .is('revoked_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserBan[];
    },
  });
};

export const useIsUserBanned = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['is-banned', userId],
    queryFn: async () => {
      if (!userId) return false;

      const { data, error } = await supabase
        .from('user_bans')
        .select('id')
        .eq('user_id', userId)
        .is('revoked_at', null)
        .or(`is_permanent.eq.true,expires_at.gt.${new Date().toISOString()}`)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!userId,
  });
};

export const useCreateBan = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      userId,
      reason,
      isPermanent,
      expiresAt,
    }: {
      userId: string;
      reason: string;
      isPermanent: boolean;
      expiresAt?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('user_bans').insert({
        user_id: userId,
        banned_by: user.id,
        reason,
        is_permanent: isPermanent,
        expires_at: expiresAt || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bans'] });
      queryClient.invalidateQueries({ queryKey: ['is-banned'] });
    },
  });
};

export const useRevokeBan = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (banId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_bans')
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
        })
        .eq('id', banId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bans'] });
      queryClient.invalidateQueries({ queryKey: ['is-banned'] });
    },
  });
};
