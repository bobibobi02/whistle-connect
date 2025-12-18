import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from './useAuth';

export interface EmailPreferences {
  id: string;
  user_id: string;
  email_new_follower: boolean;
  email_post_upvote: boolean;
  email_comment: boolean;
  inapp_new_follower: boolean;
  inapp_post_upvote: boolean;
  inapp_comment: boolean;
  snooze_until: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PREFERENCES: Partial<EmailPreferences> = {
  email_new_follower: true,
  email_post_upvote: false,
  email_comment: true,
  inapp_new_follower: true,
  inapp_post_upvote: true,
  inapp_comment: true,
  snooze_until: null,
};

export const useEmailPreferences = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['email-preferences', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // Return defaults if no preferences exist
      if (!data) {
        return DEFAULT_PREFERENCES as Partial<EmailPreferences>;
      }

      return data as EmailPreferences;
    },
    enabled: !!user,
  });
};

export const useUpdateEmailPreferences = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<EmailPreferences>) => {
      if (!user) throw new Error('Not authenticated');

      // Check if preferences exist
      const { data: existing } = await supabase
        .from('email_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('email_preferences')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('email_preferences').insert({
          user_id: user.id,
          ...DEFAULT_PREFERENCES,
          ...updates,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-preferences'] });
    },
  });
};

export const useSnoozeNotifications = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (hours: number) => {
      if (!user) throw new Error('Not authenticated');

      const snoozeUntil = new Date();
      snoozeUntil.setHours(snoozeUntil.getHours() + hours);

      const { data: existing } = await supabase
        .from('email_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('email_preferences')
          .update({
            snooze_until: snoozeUntil.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('email_preferences').insert({
          user_id: user.id,
          ...DEFAULT_PREFERENCES,
          snooze_until: snoozeUntil.toISOString(),
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-preferences'] });
    },
  });
};

export const useUnsnoozeNotifications = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('email_preferences')
        .update({
          snooze_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-preferences'] });
    },
  });
};
