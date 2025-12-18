import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from './useAuth';

export interface Post {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  community: string;
  community_icon: string | null;
  user_id: string;
  upvotes: number;
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
  is_locked?: boolean;
  is_removed?: boolean;
  flair_id?: string | null;
  flair?: {
    id: string;
    name: string;
    color: string;
    background_color: string;
  } | null;
  author?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  comment_count?: number;
  user_vote?: number | null;
}

type SortOption = 'best' | 'hot' | 'new';

export const usePosts = (sort: SortOption = 'hot', communityName?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['posts', sort, communityName, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('posts')
        .select('*')
        .eq('is_removed', false);

      if (communityName) {
        query = query.eq('community', communityName);
      }

      // Apply sorting
      switch (sort) {
        case 'best':
          query = query.order('upvotes', { ascending: false });
          break;
        case 'hot':
          query = query.order('created_at', { ascending: false }).order('upvotes', { ascending: false });
          break;
        case 'new':
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data: posts, error } = await query.limit(50);

      if (error) throw error;
      if (!posts) return [];

      // Fetch additional data for posts
      const enrichedPosts = await Promise.all(
        posts.map(async (post) => {
          // Fetch author
          const { data: author } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url')
            .eq('user_id', post.user_id)
            .single();

          // Fetch comment count
          const { count } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          // Fetch user's vote if logged in
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

          // Fetch flair if exists
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
      );

      return enrichedPosts as Post[];
    },
  });
};

export const usePost = (postId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['post', postId, user?.id],
    queryFn: async () => {
      const { data: post, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error) throw error;

      // Fetch author
      const { data: author } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('user_id', post.user_id)
        .single();

      // Fetch comment count
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);

      // Fetch user's vote if logged in
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

      // Fetch flair if exists
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
      } as Post;
    },
    enabled: !!postId,
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      title,
      content,
      community,
      image_url,
      flair_id,
    }: {
      title: string;
      content?: string;
      community: string;
      image_url?: string;
      flair_id?: string;
    }) => {
      if (!user) throw new Error('Must be logged in');

      // Get community icon
      const { data: communityData } = await supabase
        .from('communities')
        .select('icon')
        .eq('name', community)
        .single();

      const { data, error } = await supabase
        .from('posts')
        .insert({
          title,
          content,
          community,
          community_icon: communityData?.icon ?? '💬',
          image_url,
          flair_id,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};
