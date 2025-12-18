import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from './useAuth';

export const useFollowing = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['following', user?.id],
    queryFn: async (): Promise<string[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (error) throw error;
      return data?.map((f) => f.following_id) || [];
    },
    enabled: !!user,
  });
};

export const useFollowers = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['followers', userId],
    queryFn: async (): Promise<string[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', userId);

      if (error) throw error;
      return data?.map((f) => f.follower_id) || [];
    },
    enabled: !!userId,
  });
};

export const useFollowCounts = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['followCounts', userId],
    queryFn: async () => {
      if (!userId) return { followers: 0, following: 0 };

      const [followersRes, followingRes] = await Promise.all([
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', userId),
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', userId),
      ]);

      return {
        followers: followersRes.count || 0,
        following: followingRes.count || 0,
      };
    },
    enabled: !!userId,
  });
};

export const useIsFollowing = (targetUserId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['isFollowing', user?.id, targetUserId],
    queryFn: async () => {
      if (!user || !targetUserId) return false;

      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
  });
};

export const useToggleFollow = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      targetUserId,
      isFollowing,
    }: {
      targetUserId: string;
      isFollowing: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');

      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('follows').insert({
          follower_id: user.id,
          following_id: targetUserId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['followCounts'] });
      queryClient.invalidateQueries({ queryKey: ['isFollowing'] });
    },
  });
};
