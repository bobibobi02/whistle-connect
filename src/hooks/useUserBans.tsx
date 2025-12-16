import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UserBan {
  id: string;
  user_id: string;
  banned_by: string;
  reason: string;
  is_permanent: boolean;
  expires_at: string | null;
  created_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
}

export const useUserBans = () => {
  return useQuery({
    queryKey: ["user-bans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_bans")
        .select("*")
        .is("revoked_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UserBan[];
    },
  });
};

export const useBanUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      userId,
      reason,
      isPermanent,
      expiresAt,
      username
    }: {
      userId: string;
      reason: string;
      isPermanent: boolean;
      expiresAt?: string;
      username?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("user_bans").insert({
        user_id: userId,
        banned_by: user.id,
        reason,
        is_permanent: isPermanent,
        expires_at: isPermanent ? null : expiresAt,
      });

      if (error) throw error;

      // Log to audit
      await supabase.from("audit_logs").insert({
        actor_id: user.id,
        action: isPermanent ? 'permanent_ban' : 'temporary_ban',
        target_type: 'user',
        target_id: userId,
        details: { reason, expires_at: expiresAt, username }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-bans"] });
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast({ title: "User banned successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error banning user",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

export const useRevokeBan = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ banId, userId, username }: { banId: string; userId: string; username?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_bans")
        .update({ revoked_at: new Date().toISOString(), revoked_by: user.id })
        .eq("id", banId);

      if (error) throw error;

      // Log to audit
      await supabase.from("audit_logs").insert({
        actor_id: user.id,
        action: 'revoke_ban',
        target_type: 'user',
        target_id: userId,
        details: { ban_id: banId, username }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-bans"] });
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast({ title: "Ban revoked successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error revoking ban",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

export const useIsUserBanned = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-banned", userId],
    queryFn: async () => {
      if (!userId) return false;
      
      const { data, error } = await supabase.rpc("is_user_banned", { _user_id: userId });
      if (error) throw error;
      return data as boolean;
    },
    enabled: !!userId,
  });
};
