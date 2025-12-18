import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from './useAuth';
import { Post } from './usePosts';
import { Community } from './useCommunities';

interface SearchResults {
  posts: Post[];
  communities: Community[];
}

export const useSearch = (query: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['search', query, user?.id],
    queryFn: async (): Promise<SearchResults> => {
      if (!query || query.length < 2) {
        return { posts: [], communities: [] };
      }

      // Search communities
      const { data: communities } = await supabase
        .from('communities')
        .select('*')
        .or(`name.ilike.%${query}%,display_name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(10);

      // Search posts
      const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .eq('is_removed', false)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('upvotes', { ascending: false })
        .limit(20);

      // Enrich posts
      const enrichedPosts = posts
        ? await Promise.all(
            posts.map(async (post) => {
              const { data: author } = await supabase
                .from('profiles')
                .select('username, display_name, avatar_url')
                .eq('user_id', post.user_id)
                .single();

              const { count } = await supabase
                .from('comments')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);

              let user_vote = null;
              if (user) {
                const { data: voteData } = await supabase
                  .from('post_votes')
                  .select('vote_type')
                  .eq('post_id', post.id)
                  .eq('user_id', user.id)
                  .maybeSingle();
                user_vote = voteData?.vote_type ?? null;
              }

              let flair = null;
              if (post.flair_id) {
                const { data: flairData } = await supabase
                  .from('community_flairs')
                  .select('id, name, color, background_color')
                  .eq('id', post.flair_id)
                  .single();
                flair = flairData;
              }

              return {
                ...post,
                author,
                comment_count: count ?? 0,
                user_vote,
                flair,
              };
            })
          )
        : [];

      return {
        posts: enrichedPosts as Post[],
        communities: (communities ?? []) as Community[],
      };
    },
    enabled: query.length >= 2,
  });
};

// Separate hooks for more granular control
export const useSearchPosts = (query: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['search-posts', query, user?.id],
    queryFn: async (): Promise<Post[]> => {
      if (!query || query.length < 2) return [];

      const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .eq('is_removed', false)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('upvotes', { ascending: false })
        .limit(50);

      if (!posts) return [];

      // Enrich posts
      const enrichedPosts = await Promise.all(
        posts.map(async (post) => {
          const { data: author } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url')
            .eq('user_id', post.user_id)
            .single();

          const { count } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          let user_vote = null;
          if (user) {
            const { data: voteData } = await supabase
              .from('post_votes')
              .select('vote_type')
              .eq('post_id', post.id)
              .eq('user_id', user.id)
              .maybeSingle();
            user_vote = voteData?.vote_type ?? null;
          }

          return {
            ...post,
            author,
            comment_count: count ?? 0,
            user_vote,
          };
        })
      );

      return enrichedPosts as Post[];
    },
    enabled: query.length >= 2,
  });
};

export const useSearchCommunities = (query: string) => {
  return useQuery({
    queryKey: ['search-communities', query],
    queryFn: async (): Promise<Community[]> => {
      if (!query || query.length < 2) return [];

      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .or(`name.ilike.%${query}%,display_name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('member_count', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as Community[];
    },
    enabled: query.length >= 2,
  });
};
