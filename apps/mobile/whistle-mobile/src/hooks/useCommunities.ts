import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

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

export interface CommunityRule {
  id: string;
  community_id: string;
  rule_number: number;
  title: string;
  description: string | null;
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

export const useCommunity = (name: string) => {
  return useQuery({
    queryKey: ['community', name],
    queryFn: async (): Promise<Community | null> => {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('name', name)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!name,
  });
};

export const useCommunityRules = (communityId: string) => {
  return useQuery({
    queryKey: ['community-rules', communityId],
    queryFn: async (): Promise<CommunityRule[]> => {
      const { data, error } = await supabase
        .from('community_rules')
        .select('*')
        .eq('community_id', communityId)
        .order('rule_number', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!communityId,
  });
};

export const useCommunityMembership = (communityId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['community-membership', communityId, user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user) return false;

      const { data, error } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!communityId && !!user,
  });
};

export const useJoinCommunity = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (communityId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('community_members')
        .insert({ community_id: communityId, user_id: user.id });

      if (error) throw error;
    },
    onSuccess: (_, communityId) => {
      queryClient.invalidateQueries({ queryKey: ['community-membership', communityId] });
      queryClient.invalidateQueries({ queryKey: ['community', communityId] });
    },
  });
};

export const useLeaveCommunity = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (communityId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, communityId) => {
      queryClient.invalidateQueries({ queryKey: ['community-membership', communityId] });
      queryClient.invalidateQueries({ queryKey: ['community', communityId] });
    },
  });
};

const PAGE_SIZE = 10;

export const useCommunityPosts = (communityName: string) => {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['community-posts', communityName, user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .eq('community', communityName)
        .or('is_removed.is.null,is_removed.eq.false')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      if (!posts || posts.length === 0) {
        return { data: [], nextPage: null };
      }

      // Enrich posts with author info
      const userIds = [...new Set(posts.map((p) => p.user_id))];
      const postIds = posts.map((p) => p.id);

      const [profilesResult, votesResult, commentsResult, bookmarksResult] = await Promise.all([
        supabase.from('profiles').select('user_id, username, display_name, avatar_url').in('user_id', userIds),
        user
          ? supabase.from('post_votes').select('post_id, vote_type').eq('user_id', user.id).in('post_id', postIds)
          : Promise.resolve({ data: [] }),
        supabase.from('comments').select('post_id').in('post_id', postIds),
        user
          ? supabase.from('bookmarks').select('post_id').eq('user_id', user.id).in('post_id', postIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap: Record<string, any> = {};
      profilesResult.data?.forEach((p) => {
        profileMap[p.user_id] = p;
      });

      const voteMap: Record<string, number> = {};
      votesResult.data?.forEach((v) => {
        voteMap[v.post_id] = v.vote_type;
      });

      const commentCountMap: Record<string, number> = {};
      commentsResult.data?.forEach((c) => {
        commentCountMap[c.post_id] = (commentCountMap[c.post_id] || 0) + 1;
      });

      const bookmarkSet = new Set(bookmarksResult.data?.map((b) => b.post_id) || []);

      const enrichedPosts = posts.map((post) => ({
        ...post,
        author_username: profileMap[post.user_id]?.username || 'Anonymous',
        author_display_name: profileMap[post.user_id]?.display_name || null,
        author_avatar: profileMap[post.user_id]?.avatar_url || null,
        user_vote: voteMap[post.id] || null,
        comment_count: commentCountMap[post.id] || 0,
        is_bookmarked: bookmarkSet.has(post.id),
      }));

      return {
        data: enrichedPosts,
        nextPage: posts.length === PAGE_SIZE ? pageParam + 1 : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!communityName,
  });
};
