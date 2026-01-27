import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Draft {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  video_mime_type: string | null;
  video_size_bytes: number | null;
  video_duration_seconds: number | null;
  poster_image_url: string | null;
  live_url: string | null;
  community: string;
  community_icon: string | null;
  is_nsfw: boolean;
  created_at: string;
  updated_at: string;
}

export const useDrafts = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["drafts", user?.id],
    queryFn: async (): Promise<Draft[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_draft", true)
        .is("scheduled_at", null)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

export const useSaveDraft = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      content,
      image_url,
      video_url,
      video_mime_type,
      video_size_bytes,
      video_duration_seconds,
      poster_image_url,
      live_url,
      community,
      community_icon,
      is_nsfw,
    }: {
      id?: string;
      title: string;
      content?: string;
      image_url?: string;
      video_url?: string;
      video_mime_type?: string;
      video_size_bytes?: number;
      video_duration_seconds?: number;
      poster_image_url?: string;
      live_url?: string;
      community: string;
      community_icon?: string;
      is_nsfw?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const draftData = {
        user_id: user.id,
        title: title || "Untitled Draft",
        content: content || null,
        image_url: image_url || null,
        video_url: video_url || null,
        video_mime_type: video_mime_type || null,
        video_size_bytes: video_size_bytes || null,
        video_duration_seconds: video_duration_seconds || null,
        poster_image_url: poster_image_url || null,
        live_url: live_url || null,
        community: community || "general",
        community_icon: community_icon || "💬",
        is_nsfw: is_nsfw || false,
        is_draft: true,
        scheduled_at: null,
        updated_at: new Date().toISOString(),
      };

      if (id) {
        // Update existing draft
        const { data, error } = await supabase
          .from("posts")
          .update(draftData)
          .eq("id", id)
          .eq("user_id", user.id)
          .eq("is_draft", true)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from("posts")
          .insert(draftData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
    },
    onError: (error) => {
      toast({
        title: "Error saving draft",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteDraft = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (draftId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", draftId)
        .eq("user_id", user.id)
        .eq("is_draft", true);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      toast({ title: "Draft deleted" });
    },
    onError: (error) => {
      toast({
        title: "Error deleting draft",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const usePublishDraft = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (draftId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("posts")
        .update({
          is_draft: false,
          scheduled_at: null, // Clear scheduled time on immediate publish
          updated_at: new Date().toISOString(),
        })
        .eq("id", draftId)
        .eq("user_id", user.id)
        .eq("is_draft", true)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast({ title: "Post published!", description: "Your draft is now live." });
    },
    onError: (error) => {
      toast({
        title: "Error publishing draft",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
