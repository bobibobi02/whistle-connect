import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  return useQuery({
    queryKey: ["legal-pages", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_pages")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      return data as LegalPage | null;
    },
    enabled: !!slug,
  });
};

export const useUpdateLegalPage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      slug, 
      title, 
      markdown_content, 
      is_published 
    }: { 
      slug: string; 
      title?: string;
      markdown_content?: string; 
      is_published?: boolean;
    }) => {
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

      // Update app setting
      await supabase
        .from("app_settings")
        .update({ value: { published: true } })
        .eq("key", "legal_pages_published");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal-pages"] });
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    },
  });
};
