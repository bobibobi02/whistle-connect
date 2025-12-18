import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from './useAuth';
import { Post } from './usePosts';

export const useBookmarks = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: bookmarks, error } = await supabase
        .from('bookmarks')
        .select('post_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!bookmarks?.length) return [];

      const postIds = bookmarks.map((b) => b.post_id);

      const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .in('id', postIds);

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

          const { data: voteData } = await supabase
            .from('post_votes')
            .select('vote_type')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .maybeSingle();

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
            user_vote: voteData?.vote_type ?? null,
            flair,
          };
        })
      );

      return enrichedPosts as Post[];
    },
    enabled: !!user,
  });
};

export const useIsBookmarked = (postId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['bookmark', postId, user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      return !!data;
    },
    enabled: !!user && !!postId,
  });
};

export const useToggleBookmark = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error('Must be logged in');

      const { data: existing } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('bookmarks')
          .delete()
          .eq('id', existing.id);
        return { bookmarked: false };
      } else {
        await supabase
          .from('bookmarks')
          .insert({
            post_id: postId,
            user_id: user.id,
          });
        return { bookmarked: true };
      }
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ['bookmark', postId] });
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
};
