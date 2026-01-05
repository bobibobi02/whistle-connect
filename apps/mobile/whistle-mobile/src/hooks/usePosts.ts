import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useNsfwSettings } from './useNsfwSettings';

export interface Post {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  poster_image_url: string | null;
  video_duration_seconds: number | null;
  community: string;
  community_icon: string | null;
  user_id: string;
  upvotes: number;
  created_at: string;
  is_nsfw: boolean | null;
  is_pinned: boolean | null;
  is_locked: boolean | null;
  is_removed: boolean | null;
  live_url: string | null;
  author_username?: string;
  author_display_name?: string;
  author_avatar?: string;
  comment_count: number;
  user_vote?: number;
  is_bookmarked?: boolean;
}

type SortOption = 'hot' | 'new' | 'top';

const PAGE_SIZE = 20;

// Helper function to enrich posts with author info and counts
async function enrichPosts(posts: any[], userId: string | undefined): Promise<Post[]> {
  return Promise.all(
    posts.map(async (post) => {
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

      // Get user vote if logged in
      let userVote = 0;
      if (userId) {
        const { data: vote } = await supabase
          .from('post_votes')
          .select('vote_type')
          .eq('post_id', post.id)
          .eq('user_id', userId)
          .maybeSingle();
        userVote = vote?.vote_type ?? 0;
      }

      // Check if bookmarked
      let isBookmarked = false;
      if (userId) {
        const { data: bookmark } = await supabase
          .from('bookmarks')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', userId)
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
      };
    })
  );
}

export const useInfinitePosts = (sort: SortOption = 'hot') => {
  const { user } = useAuth();
  const { allowNsfw } = useNsfwSettings();
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    queryKey: ['posts', 'infinite', sort, user?.id, allowNsfw],
    queryFn: async ({ pageParam = 0 }): Promise<{ posts: Post[]; nextPage: number | undefined }> => {
      let query = supabase
        .from('posts')
        .select('*')
        .or('is_removed.is.null,is_removed.eq.false');

      // Filter NSFW content if not allowed
      if (!allowNsfw) {
        query = query.or('is_nsfw.is.null,is_nsfw.eq.false');
      }

      // Apply sorting
      switch (sort) {
        case 'new':
          query = query.order('created_at', { ascending: false });
          break;
        case 'top':
          query = query.order('upvotes', { ascending: false });
          break;
        case 'hot':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      // Pagination
      query = query.range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      const { data: posts, error } = await query;

      if (error) throw error;
      if (!posts) return { posts: [], nextPage: undefined };

      const enrichedPosts = await enrichPosts(posts, user?.id);

      return {
        posts: enrichedPosts,
        nextPage: posts.length === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    staleTime: 1000 * 60, // 1 minute
  });
};

// Legacy hook for backwards compatibility
export const usePosts = (sort: SortOption = 'hot') => {
  const { user } = useAuth();
  const { allowNsfw } = useNsfwSettings();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['posts', sort, user?.id, allowNsfw],
    queryFn: async (): Promise<Post[]> => {
      let query = supabase
        .from('posts')
        .select('*')
        .or('is_removed.is.null,is_removed.eq.false');

      // Filter NSFW content if not allowed
      if (!allowNsfw) {
        query = query.or('is_nsfw.is.null,is_nsfw.eq.false');
      }

      // Apply sorting
      switch (sort) {
        case 'new':
          query = query.order('created_at', { ascending: false });
          break;
        case 'top':
          query = query.order('upvotes', { ascending: false });
          break;
        case 'hot':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      query = query.limit(50);

      const { data: posts, error } = await query;

      if (error) throw error;
      if (!posts) return [];

      return enrichPosts(posts, user?.id);
    },
    staleTime: 1000 * 60, // 1 minute
  });
};

export const usePost = (postId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['post', postId, user?.id],
    queryFn: async (): Promise<Post | null> => {
      const { data: post, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .maybeSingle();

      if (error) throw error;
      if (!post) return null;

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

      // Get user vote if logged in
      let userVote = 0;
      if (user) {
        const { data: vote } = await supabase
          .from('post_votes')
          .select('vote_type')
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .maybeSingle();
        userVote = vote?.vote_type ?? 0;
      }

      // Check if bookmarked
      let isBookmarked = false;
      if (user) {
        const { data: bookmark } = await supabase
          .from('bookmarks')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', user.id)
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
      };
    },
    enabled: !!postId,
  });
};
