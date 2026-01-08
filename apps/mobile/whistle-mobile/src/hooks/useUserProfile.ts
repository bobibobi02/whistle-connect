import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { Post } from './usePosts';

const PAGE_SIZE = 20;

export interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export const useUserProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['userProfile', userId],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

export const useUserProfileByUsername = (username: string | undefined) => {
  return useQuery({
    queryKey: ['userProfileByUsername', username],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!username) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!username,
  });
};

export const useUserPosts = (userId: string | undefined) => {
  const { user: currentUser } = useAuth();

  return useInfiniteQuery({
    queryKey: ['userPosts', userId],
    queryFn: async ({ pageParam = 0 }): Promise<{ posts: Post[]; nextPage: number | undefined }> => {
      if (!userId) return { posts: [], nextPage: undefined };

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .or('is_removed.is.null,is_removed.eq.false')
        .order('created_at', { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      if (!data) return { posts: [], nextPage: undefined };

      const posts = await Promise.all(
        data.map(async (post) => {
          // Get author profile
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

          // Get current user's vote if logged in
          let userVote = 0;
          let isBookmarked = false;
          if (currentUser) {
            const { data: vote } = await supabase
              .from('post_votes')
              .select('vote_type')
              .eq('post_id', post.id)
              .eq('user_id', currentUser.id)
              .maybeSingle();
            userVote = vote?.vote_type ?? 0;

            const { data: bookmark } = await supabase
              .from('bookmarks')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', currentUser.id)
              .maybeSingle();
            isBookmarked = !!bookmark;
          }

          return {
            ...post,
            author_username: profile?.username ?? 'Anonymous',
            author_display_name: profile?.display_name ?? profile?.username ?? 'Anonymous',
            author_avatar: profile?.avatar_url,
            comment_count: commentCount ?? 0,
            user_vote: userVote,
            is_bookmarked: isBookmarked,
          } as Post;
        })
      );

      return {
        posts,
        nextPage: data.length === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!userId,
  });
};
