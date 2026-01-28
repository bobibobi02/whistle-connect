import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useIsModerator } from "@/hooks/useUserRoles";
import type { Json } from "@/integrations/supabase/types";

export interface LegalPage {
  id: string;
  slug: string;
  title: string;
  markdown_content: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export const useLegalPages = () => {
  return useQuery({
    queryKey: ["legal-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_pages")
        .select("*")
        .order("slug");

      if (error) throw error;
      return data as LegalPage[];
    },
  });
};

export const useLegalPage = (slug: string) => {
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { isModerator, isLoading: modLoading } = useIsModerator();

  return useQuery({
    queryKey: ["legal-pages", slug, isAdmin, isModerator],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_pages")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      
      // If user is not admin/mod, only return published pages
      if (data && !isAdmin && !isModerator && !data.is_published) {
        return null;
      }
      
      return data as LegalPage | null;
    },
    enabled: !!slug && !adminLoading && !modLoading,
  });
};

interface LegalPageUpdate {
  slug: string;
  title?: string;
  markdown_content?: string;
  is_published?: boolean;
}

export const useUpdateLegalPage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      slug, 
      title, 
      markdown_content, 
      is_published 
    }: LegalPageUpdate) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updates: Partial<LegalPage> = { updated_by: user?.id };
      if (title !== undefined) updates.title = title;
      if (markdown_content !== undefined) updates.markdown_content = markdown_content;
      if (is_published !== undefined) updates.is_published = is_published;

      const { error } = await supabase
        .from("legal_pages")
        .update(updates)
        .eq("slug", slug);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal-pages"] });
    },
  });
};

export const usePublishAllLegalPages = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("legal_pages")
        .update({ is_published: true, updated_by: user?.id })
        .neq("slug", "");

      if (error) throw error;

      // Upsert app setting to track that pages have been published
      // First check if setting exists
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("key", "legal_pages_published")
        .maybeSingle();

      const settingValue: Json = { published: true, published_at: new Date().toISOString() };
      
      if (existing) {
        const { error: settingsError } = await supabase
          .from("app_settings")
          .update({ value: settingValue, updated_by: user?.id })
          .eq("key", "legal_pages_published");
        if (settingsError) throw settingsError;
      } else {
        const { error: settingsError } = await supabase
          .from("app_settings")
          .insert([{ key: "legal_pages_published", value: settingValue, updated_by: user?.id }]);
        if (settingsError) throw settingsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal-pages"] });
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    },
  });
};
