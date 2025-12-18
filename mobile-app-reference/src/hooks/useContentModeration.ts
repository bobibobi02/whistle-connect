import { supabase } from '@/config/supabase';

export interface ModerationResult {
  allowed: boolean;
  reason: string | null;
}

export const useContentModeration = () => {
  const moderateContent = async (
    content: string,
    type: 'post' | 'comment'
  ): Promise<ModerationResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('moderate-content', {
        body: { content, type },
      });

      if (error) {
        console.error('Moderation error:', error);
        return { allowed: true, reason: null };
      }

      return {
        allowed: data?.allowed !== false,
        reason: data?.reason || null,
      };
    } catch (err) {
      console.error('Moderation failed:', err);
      return { allowed: true, reason: null };
    }
  };

  return { moderateContent };
};
