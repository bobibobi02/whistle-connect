import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { Post } from './usePosts';
import { Alert } from 'react-native';

const PAGE_SIZE = 20;

export const useBookmarks = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: async ({ pageParam = 0 }): Promise<{ posts: Post[]; nextPage: number | undefined }> => {
      if (!user) return { posts: [], nextPage: undefined };

      const { data: bookmarks, error } = await supabase
        .from('bookmarks')
        .select(`
          id,
          post_id,
          created_at,
          posts (
            id,
            title,
            content,
            image_url,
            video_url,
            poster_image_url,
            video_duration_seconds,
            community,
            community_icon,
            user_id,
            upvotes,
            created_at,
            is_nsfw,
            is_pinned,
            is_locked,
            is_removed,
            live_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      if (!bookmarks) return { posts: [], nextPage: undefined };

      // Enrich posts with author info
      const posts = await Promise.all(
        bookmarks
          .filter((b) => b.posts)
          .map(async (bookmark) => {
            const post = bookmark.posts as any;

            // Get author info
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, display_name, avatar_url')
              .eq('user_id', post.user_id)
              .maybeSingle();

            // Get comment count
            const { count: commentCount } = await supabase
              .from('comments')
              .select('id', { count: 'exact', head: true })
              .eq('post_id', post.id)
              .or('is_removed.is.null,is_removed.eq.false');

            // Get user vote
            const { data: vote } = await supabase
              .from('post_votes')
              .select('vote_type')
              .eq('post_id', post.id)
              .eq('user_id', user.id)
              .maybeSingle();

            return {
              ...post,
              author_username: profile?.username ?? 'Anonymous',
              author_display_name: profile?.display_name ?? profile?.username ?? 'Anonymous',
              author_avatar: profile?.avatar_url,
              comment_count: commentCount ?? 0,
              user_vote: vote?.vote_type ?? 0,
              is_bookmarked: true,
            } as Post;
          })
      );

      return {
        posts,
        nextPage: bookmarks.length === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!user,
  });
};

export const useToggleBookmark = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, isBookmarked }: { postId: string; isBookmarked: boolean }) => {
      if (!user) throw new Error('Must be logged in');

      if (isBookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('bookmarks')
          .insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      }

      return { postId, isNowBookmarked: !isBookmarked };
    },
    onMutate: async ({ postId, isBookmarked }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      await queryClient.cancelQueries({ queryKey: ['post', postId] });
      await queryClient.cancelQueries({ queryKey: ['bookmarks'] });

      // Optimistically update post
      queryClient.setQueryData(['post', postId, user?.id], (old: Post | null) => {
        if (!old) return old;
        return { ...old, is_bookmarked: !isBookmarked };
      });

      return { postId, previousBookmarked: isBookmarked };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context) {
        queryClient.setQueryData(['post', context.postId, user?.id], (old: Post | null) => {
          if (!old) return old;
          return { ...old, is_bookmarked: context.previousBookmarked };
        });
      }
      Alert.alert('Error', 'Failed to update bookmark');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
};

export const useBookmarkCount = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['bookmarks', 'count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('bookmarks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });
};
