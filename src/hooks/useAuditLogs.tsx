import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
  actor?: {
    username: string | null;
    display_name: string | null;
  };
}

export type AuditAction = 
  | 'delete_post'
  | 'delete_comment'
  | 'resolve_report'
  | 'dismiss_report'
  | 'assign_role'
  | 'remove_role';

export const useAuditLogs = (limit: number = 100) => {
  return useQuery({
    queryKey: ["audit-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Fetch actor profiles
      const actorIds = [...new Set(data.map(log => log.actor_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name")
        .in("user_id", actorIds);

      const profileMap = new Map<string, any>();
      profiles?.forEach(p => profileMap.set(p.user_id, p));

      return data.map(log => ({
        ...log,
        actor: profileMap.get(log.actor_id) || null
      })) as AuditLog[];
    },
  });
};

export const useCreateAuditLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      action,
      targetType,
      targetId,
      details
    }: {
      action: AuditAction;
      targetType: string;
      targetId?: string;
      details?: Record<string, any>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("audit_logs")
        .insert({
          actor_id: user.id,
          action,
          target_type: targetType,
          target_id: targetId || null,
          details: details || null
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    }
  });
};
