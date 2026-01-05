import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface NsfwSettings {
  allow_nsfw: boolean;
  nsfw_confirmed_at: string | null;
}

export const useNsfwSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['nsfw-settings', user?.id],
    queryFn: async (): Promise<NsfwSettings> => {
      if (!user) return { allow_nsfw: false, nsfw_confirmed_at: null };

      const { data, error } = await supabase
        .from('profiles')
        .select('allow_nsfw, nsfw_confirmed_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return {
        allow_nsfw: data?.allow_nsfw ?? false,
        nsfw_confirmed_at: data?.nsfw_confirmed_at ?? null,
      };
    },
    enabled: !!user,
  });

  const enableNsfw = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          allow_nsfw: true,
          nsfw_confirmed_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nsfw-settings', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const disableNsfw = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ allow_nsfw: false })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nsfw-settings', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  return {
    allowNsfw: settings?.allow_nsfw ?? false,
    nsfwConfirmedAt: settings?.nsfw_confirmed_at,
    isLoading,
    enableNsfw,
    disableNsfw,
  };
};
