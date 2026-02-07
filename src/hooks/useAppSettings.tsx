import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface AppSetting {
  id: string;
  key: string;
  value: Json;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

export const useAppSettings = () => {
  return useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("*")
          .order("key");

        // Handle table not existing (404) or permission errors gracefully
        if (error) {
          // PGRST116 = table doesn't exist, 42P01 = relation doesn't exist
          if (error.code === "PGRST116" || error.code === "42P01" || error.message?.includes("does not exist")) {
            console.warn("[useAppSettings] app_settings table may not exist, returning empty array");
            return [];
          }
          throw error;
        }
        return data as AppSetting[];
      } catch (err) {
        console.warn("[useAppSettings] Error fetching settings:", err);
        return [];
      }
    },
  });
};

export const useAppSetting = (key: string) => {
  return useQuery({
    queryKey: ["app-settings", key],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("*")
          .eq("key", key)
          .maybeSingle();

        // Handle table not existing (404) or permission errors gracefully
        if (error) {
          // PGRST116 = table doesn't exist, 42P01 = relation doesn't exist
          if (error.code === "PGRST116" || error.code === "42P01" || error.message?.includes("does not exist")) {
            console.warn(`[useAppSetting] app_settings table may not exist, returning null for key: ${key}`);
            return null;
          }
          throw error;
        }
        return data as AppSetting | null;
      } catch (err) {
        console.warn(`[useAppSetting] Error fetching ${key}:`, err);
        return null;
      }
    },
  });
};

export const useUpdateAppSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Json }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // First try to update
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("key", key)
        .maybeSingle();
      
      if (existing) {
        const { error } = await supabase
          .from("app_settings")
          .update({ value, updated_by: user?.id })
          .eq("key", key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("app_settings")
          .insert([{ key, value, updated_by: user?.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    },
  });
};

export const useEmergencyMode = () => {
  const { data: setting } = useAppSetting("emergency_mode");
  const value = setting?.value as { enabled?: boolean; message?: string } | undefined;
  return {
    enabled: value?.enabled ?? false,
    message: value?.message ?? "Site is temporarily in read-only mode.",
  };
};
