import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AppRole } from "./useUserRoles";

export interface UserWithRoles {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: AppRole[];
}

export const useUsersWithRoles = () => {
  return useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Map roles to users
      const rolesByUser = new Map<string, AppRole[]>();
      roles?.forEach(r => {
        const existing = rolesByUser.get(r.user_id) || [];
        existing.push(r.role as AppRole);
        rolesByUser.set(r.user_id, existing);
      });

      return profiles.map(profile => ({
        ...profile,
        roles: rolesByUser.get(profile.user_id) || []
      })) as UserWithRoles[];
    },
  });
};

export const useAssignRole = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role, username }: { userId: string; role: AppRole; username?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (error) throw error;
      
      // Log to audit
      await supabase.from("audit_logs").insert({
        actor_id: user.id,
        action: 'assign_role',
        target_type: 'user',
        target_id: userId,
        details: { role, username }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast({ title: "Role assigned successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error assigning role",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

export const useRemoveRole = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role, username }: { userId: string; role: AppRole; username?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (error) throw error;
      
      // Log to audit
      await supabase.from("audit_logs").insert({
        actor_id: user.id,
        action: 'remove_role',
        target_type: 'user',
        target_id: userId,
        details: { role, username }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast({ title: "Role removed successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error removing role",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};
