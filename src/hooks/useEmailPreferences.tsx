import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface EmailPreferences {
  id: string;
  user_id: string;
  email_new_follower: boolean;
  email_post_upvote: boolean;
  email_comment: boolean;
  inapp_new_follower: boolean;
  inapp_post_upvote: boolean;
  inapp_comment: boolean;
  created_at: string;
  updated_at: string;
}

export const useEmailPreferences = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["email-preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("email_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      // Return defaults if no preferences exist
      if (!data) {
        return {
          email_new_follower: true,
          email_post_upvote: false,
          email_comment: true,
          inapp_new_follower: true,
          inapp_post_upvote: true,
          inapp_comment: true,
        } as Partial<EmailPreferences>;
      }
      
      return data as EmailPreferences;
    },
    enabled: !!user,
  });
};

export const useUpdateEmailPreferences = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: Partial<EmailPreferences>) => {
      if (!user) throw new Error("Not authenticated");

      // Try to update first
      const { data: existing } = await supabase
        .from("email_preferences")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("email_preferences")
          .update(preferences)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("email_preferences")
          .insert({ ...preferences, user_id: user.id });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-preferences"] });
    },
  });
};
