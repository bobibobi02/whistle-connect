import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type CommunityRole = "owner" | "moderator" | "member" | "banned" | "muted";

export interface CommunityRoleRecord {
  id: string;
  community_id: string;
  user_id: string;
  role: CommunityRole;
  reason: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const useCommunityRoles = (communityId: string | undefined) => {
  return useQuery({
    queryKey: ["community-roles", communityId],
    queryFn: async () => {
      if (!communityId) return [];
      
      const { data, error } = await supabase
        .from("community_roles")
        .select("*")
        .eq("community_id", communityId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Fetch profiles for users
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return data.map(role => ({
        ...role,
        role: role.role as CommunityRole,
        profile: profileMap.get(role.user_id) || null
      })) as CommunityRoleRecord[];
    },
    enabled: !!communityId,
  });
};

export const useUserCommunityRole = (communityId: string | undefined, userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-community-role", communityId, userId],
    queryFn: async () => {
      if (!communityId || !userId) return null;
      
      const { data, error } = await supabase
        .from("community_roles")
        .select("*")
        .eq("community_id", communityId)
        .eq("user_id", userId)
        .in("role", ["owner", "moderator"])
        .maybeSingle();
      
      if (error) throw error;
      return data ? (data.role as CommunityRole) : null;
    },
    enabled: !!communityId && !!userId,
  });
};

export const useIsCommunityMod = (communityId: string | undefined, userId: string | undefined) => {
  return useQuery({
    queryKey: ["is-community-mod", communityId, userId],
    queryFn: async () => {
      if (!communityId || !userId) return false;
      
      const { data, error } = await supabase.rpc("is_community_mod", {
        _community_id: communityId,
        _user_id: userId
      });
      
      if (error) throw error;
      return data as boolean;
    },
    enabled: !!communityId && !!userId,
  });
};

export const useIsUserBannedFromCommunity = (communityId: string | undefined, userId: string | undefined) => {
  return useQuery({
    queryKey: ["is-banned-from-community", communityId, userId],
    queryFn: async () => {
      if (!communityId || !userId) return false;
      
      const { data, error } = await supabase
        .from("community_roles")
        .select("id")
        .eq("community_id", communityId)
        .eq("user_id", userId)
        .eq("role", "banned")
        .or("expires_at.is.null,expires_at.gt.now()")
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!communityId && !!userId,
  });
};

export const useAssignCommunityRole = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      communityId,
      userId,
      role,
      reason,
      expiresAt
    }: {
      communityId: string;
      userId: string;
      role: CommunityRole;
      reason?: string;
      expiresAt?: string;
    }) => {
      // First check if user already has a role (except member)
      const { data: existing } = await supabase
        .from("community_roles")
        .select("id")
        .eq("community_id", communityId)
        .eq("user_id", userId)
        .eq("role", role)
        .maybeSingle();
      
      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("community_roles")
          .update({ reason, expires_at: expiresAt, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("community_roles")
          .insert({
            community_id: communityId,
            user_id: userId,
            role,
            reason,
            expires_at: expiresAt
          });
        if (error) throw error;
      }
      
      // Log the action
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("community_mod_log").insert({
          community_id: communityId,
          mod_id: user.id,
          action: `assign_${role}`,
          target_type: "user",
          target_user_id: userId,
          details: { reason, expires_at: expiresAt }
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["community-roles", variables.communityId] });
      queryClient.invalidateQueries({ queryKey: ["user-community-role"] });
      queryClient.invalidateQueries({ queryKey: ["is-community-mod"] });
      queryClient.invalidateQueries({ queryKey: ["is-banned-from-community"] });
      toast({ title: "Role assigned successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error assigning role", description: error.message, variant: "destructive" });
    },
  });
};

export const useRemoveCommunityRole = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      communityId,
      userId,
      role
    }: {
      communityId: string;
      userId: string;
      role: CommunityRole;
    }) => {
      const { error } = await supabase
        .from("community_roles")
        .delete()
        .eq("community_id", communityId)
        .eq("user_id", userId)
        .eq("role", role);
      
      if (error) throw error;
      
      // Log the action
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("community_mod_log").insert({
          community_id: communityId,
          mod_id: user.id,
          action: `remove_${role}`,
          target_type: "user",
          target_user_id: userId
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["community-roles", variables.communityId] });
      queryClient.invalidateQueries({ queryKey: ["user-community-role"] });
      queryClient.invalidateQueries({ queryKey: ["is-community-mod"] });
      queryClient.invalidateQueries({ queryKey: ["is-banned-from-community"] });
      toast({ title: "Role removed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error removing role", description: error.message, variant: "destructive" });
    },
  });
};
