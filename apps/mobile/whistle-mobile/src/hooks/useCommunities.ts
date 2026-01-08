import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface Community {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  member_count: number;
  created_by: string;
  created_at: string;
}

export const useCommunities = () => {
  return useQuery({
    queryKey: ['communities'],
    queryFn: async (): Promise<Community[]> => {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .order('member_count', { ascending: false });

      if (error) throw error;
      
      // Ensure "general" is always available as default
      const communities = data || [];
      const hasGeneral = communities.some(c => c.name === 'general');
      if (!hasGeneral) {
        communities.unshift({
          id: 'general',
          name: 'general',
          display_name: 'General',
          description: 'General discussion',
          icon: '💬',
          member_count: 0,
          created_by: '',
          created_at: new Date().toISOString(),
        });
      }
      return communities;
    },
  });
};
