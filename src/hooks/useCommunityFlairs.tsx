import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CommunityFlair {
  id: string;
  community_id: string;
  name: string;
  color: string;
  background_color: string;
  is_mod_only: boolean;
  created_at: string;
}

export interface CommunityUserFlair {
  id: string;
  community_id: string;
  user_id: string;
  flair_text: string | null;
  flair_color: string;
  created_at: string;
  updated_at: string;
}

export const useCommunityFlairs = (communityId: string | undefined) => {
  return useQuery({
    queryKey: ["community-flairs", communityId],
    queryFn: async () => {
      if (!communityId) return [];
      
      const { data, error } = await supabase
        .from("community_flairs")
        .select("*")
        .eq("community_id", communityId)
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data as CommunityFlair[];
    },
    enabled: !!communityId,
  });
};

export const useCreateCommunityFlair = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      communityId,
      name,
      color,
      backgroundColor,
      isModOnly
    }: {
      communityId: string;
      name: string;
      color?: string;
      backgroundColor?: string;
      isModOnly?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("community_flairs")
        .insert({
          community_id: communityId,
          name,
          color: color || "#FF5C7A",
          background_color: backgroundColor || "#1E1A18",
          is_mod_only: isModOnly || false
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Log the action
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("community_mod_log").insert({
          community_id: communityId,
          mod_id: user.id,
          action: "create_flair",
          target_type: "flair",
          target_id: data.id,
          details: { name }
        });
      }
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["community-flairs", variables.communityId] });
      toast({ title: "Flair created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error creating flair", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateCommunityFlair = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      flairId,
      communityId,
      name,
      color,
      backgroundColor,
      isModOnly
    }: {
      flairId: string;
      communityId: string;
      name: string;
      color?: string;
      backgroundColor?: string;
      isModOnly?: boolean;
    }) => {
      const { error } = await supabase
        .from("community_flairs")
        .update({
          name,
          color: color || "#FF5C7A",
          background_color: backgroundColor || "#1E1A18",
          is_mod_only: isModOnly || false
        })
        .eq("id", flairId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["community-flairs", variables.communityId] });
      toast({ title: "Flair updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating flair", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeleteCommunityFlair = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      flairId,
      communityId
    }: {
      flairId: string;
      communityId: string;
    }) => {
      const { error } = await supabase
        .from("community_flairs")
        .delete()
        .eq("id", flairId);
      
      if (error) throw error;
      
      // Log the action
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("community_mod_log").insert({
          community_id: communityId,
          mod_id: user.id,
          action: "delete_flair",
          target_type: "flair",
          target_id: flairId
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["community-flairs", variables.communityId] });
      toast({ title: "Flair deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting flair", description: error.message, variant: "destructive" });
    },
  });
};

// User flairs
export const useUserCommunityFlair = (communityId: string | undefined, userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-community-flair", communityId, userId],
    queryFn: async () => {
      if (!communityId || !userId) return null;
      
      const { data, error } = await supabase
        .from("community_user_flairs")
        .select("*")
        .eq("community_id", communityId)
        .eq("user_id", userId)
        .maybeSingle();
      
      if (error) throw error;
      return data as CommunityUserFlair | null;
    },
    enabled: !!communityId && !!userId,
  });
};

export const useSetUserFlair = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      communityId,
      flairText,
      flairColor
    }: {
      communityId: string;
      flairText: string;
      flairColor?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("community_user_flairs")
        .upsert({
          community_id: communityId,
          user_id: user.id,
          flair_text: flairText,
          flair_color: flairColor || "#34D399",
          updated_at: new Date().toISOString()
        }, {
          onConflict: "community_id,user_id"
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-community-flair", variables.communityId] });
      toast({ title: "Flair updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error setting flair", description: error.message, variant: "destructive" });
    },
  });
};

export const useRemoveUserFlair = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ communityId }: { communityId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("community_user_flairs")
        .delete()
        .eq("community_id", communityId)
        .eq("user_id", user.id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-community-flair", variables.communityId] });
      toast({ title: "Flair removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error removing flair", description: error.message, variant: "destructive" });
    },
  });
};
