import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = 'admin' | 'moderator' | 'user';

export const useUserRoles = () => {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Log in dev mode for debugging
      if (import.meta.env.DEV) {
        console.log("[Roles] Fetching roles for user:", user.id);
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        if (import.meta.env.DEV) {
          console.error("[Roles] Error fetching roles:", error.message);
        }
        // Return empty array on error (user has no special roles)
        return [];
      }

      const roles = data.map(r => r.role as AppRole);
      
      if (import.meta.env.DEV) {
        console.log("[Roles] Found roles:", roles.length > 0 ? roles : "(none)");
      }

      return roles;
    },
    enabled: !!user?.id && !authLoading,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1, // Only retry once on failure
  });
};

export const useHasRole = (role: AppRole) => {
  const { data: roles = [], isLoading } = useUserRoles();
  return {
    hasRole: roles.includes(role),
    isLoading
  };
};

export const useIsAdmin = () => {
  const { data: roles = [], isLoading } = useUserRoles();
  return {
    isAdmin: roles.includes('admin'),
    isLoading
  };
};

export const useIsModerator = () => {
  const { data: roles = [], isLoading } = useUserRoles();
  return {
    isModerator: roles.includes('admin') || roles.includes('moderator'),
    isLoading
  };
};
