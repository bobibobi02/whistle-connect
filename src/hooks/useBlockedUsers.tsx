import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  blocked_profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const useBlockedUsers = () => {
  return useQuery({
    queryKey: ["blocked-users"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("blocked_users")
        .select("*")
        .eq("blocker_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for blocked users
      if (data && data.length > 0) {
        const blockedIds = data.map(b => b.blocked_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", blockedIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        return data.map(blocked => ({
          ...blocked,
          blocked_profile: profileMap.get(blocked.blocked_id) || null
        })) as BlockedUser[];
      }

      return data as BlockedUser[];
    },
  });
};

export const useBlockUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (blockedId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("blocked_users").insert({
        blocker_id: user.id,
        blocked_id: blockedId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      toast({ title: "User blocked successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error blocking user",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

export const useUnblockUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (blockedId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("blocked_users")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", blockedId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      toast({ title: "User unblocked successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error unblocking user",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

export const useIsUserBlocked = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["is-blocked", userId],
    queryFn: async () => {
      if (!userId) return false;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from("blocked_users")
        .select("id")
        .eq("blocker_id", user.id)
        .eq("blocked_id", userId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!userId,
  });
};

// Check if target user has blocked the current user
export const useHasUserBlockedMe = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["has-blocked-me", userId],
    queryFn: async () => {
      if (!userId) return false;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from("blocked_users")
        .select("id")
        .eq("blocker_id", userId)
        .eq("blocked_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!userId,
  });
};
