import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AppSetting {
  id: string;
  key: string;
  value: Record<string, any>;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

export const useAppSettings = () => {
  return useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .order("key");

      if (error) throw error;
      return data as AppSetting[];
    },
  });
};

export const useAppSetting = (key: string) => {
  return useQuery({
    queryKey: ["app-settings", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .eq("key", key)
        .maybeSingle();

      if (error) throw error;
      return data as AppSetting | null;
    },
  });
};

export const useUpdateAppSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Record<string, any> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("app_settings")
        .update({ value, updated_by: user?.id })
        .eq("key", key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    },
  });
};

export const useEmergencyMode = () => {
  const { data: setting } = useAppSetting("emergency_mode");
  return {
    enabled: setting?.value?.enabled ?? false,
    message: setting?.value?.message ?? "Site is temporarily in read-only mode.",
  };
};
