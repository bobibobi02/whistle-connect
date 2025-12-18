import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'moderator' | 'user';

export const useUserRoles = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching roles:', error);
        return [];
      }

      return data.map((r) => r.role as AppRole);
    },
    enabled: !!user?.id,
  });
};

export const useHasRole = (role: AppRole) => {
  const { data: roles = [], isLoading } = useUserRoles();
  return {
    hasRole: roles.includes(role),
    isLoading,
  };
};

export const useIsAdmin = () => {
  const { data: roles = [], isLoading } = useUserRoles();
  return {
    isAdmin: roles.includes('admin'),
    isLoading,
  };
};

export const useIsModerator = () => {
  const { data: roles = [], isLoading } = useUserRoles();
  return {
    isModerator: roles.includes('admin') || roles.includes('moderator'),
    isLoading,
  };
};
