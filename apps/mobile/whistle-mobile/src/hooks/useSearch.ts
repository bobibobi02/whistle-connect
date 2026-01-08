import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface SearchPost {
  id: string;
  title: string;
  content: string | null;
  community: string;
  user_id: string;
  upvotes: number;
  created_at: string;
  image_url: string | null;
  video_url: string | null;
  poster_image_url: string | null;
  video_duration_seconds: number | null;
  is_nsfw: boolean | null;
  author_username?: string;
  author_display_name?: string;
  user_vote?: number | null;
  comment_count?: number;
  is_bookmarked?: boolean;
}

export interface SearchUser {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export interface SearchCommunity {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  member_count: number | null;
}

export interface SearchResults {
  posts: SearchPost[];
  users: SearchUser[];
  communities: SearchCommunity[];
}

export const useSearch = (query: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['search', query, user?.id],
    queryFn: async (): Promise<SearchResults> => {
      if (!query || query.length < 2) {
        return { posts: [], users: [], communities: [] };
      }

      const searchTerm = `%${query}%`;

      // Search in parallel
      const [postsResult, usersResult, communitiesResult] = await Promise.all([
        // Search posts
        supabase
          .from('posts')
          .select('*')
          .or('is_removed.is.null,is_removed.eq.false')
          .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
          .order('created_at', { ascending: false })
          .limit(15),
        // Search users by username or display_name
        supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url, bio')
          .or(`username.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
          .limit(10),
        // Search communities
        supabase
          .from('communities')
          .select('id, name, display_name, description, icon, member_count')
          .or(`name.ilike.${searchTerm},display_name.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(10),
      ]);

      const posts = postsResult.data || [];
      const users = usersResult.data || [];
      const communities = communitiesResult.data || [];

      if (posts.length === 0) {
        return { posts: [], users, communities };
      }

      // Enrich posts with author info, votes, comments, bookmarks
      const userIds = [...new Set(posts.map((p) => p.user_id))];
      const postIds = posts.map((p) => p.id);

      const [profilesResult, votesResult, commentsResult, bookmarksResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, username, display_name')
          .in('user_id', userIds),
        user
          ? supabase
              .from('post_votes')
              .select('post_id, vote_type')
              .eq('user_id', user.id)
              .in('post_id', postIds)
          : Promise.resolve({ data: [] }),
        supabase
          .from('comments')
          .select('post_id')
          .in('post_id', postIds),
        user
          ? supabase
              .from('bookmarks')
              .select('post_id')
              .eq('user_id', user.id)
              .in('post_id', postIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap: Record<string, { username: string | null; display_name: string | null }> = {};
      profilesResult.data?.forEach((p) => {
        profileMap[p.user_id] = { username: p.username, display_name: p.display_name };
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

      const enrichedPosts: SearchPost[] = posts.map((post) => ({
        ...post,
        author_username: profileMap[post.user_id]?.username || 'Anonymous',
        author_display_name: profileMap[post.user_id]?.display_name || null,
        user_vote: voteMap[post.id] || null,
        comment_count: commentCountMap[post.id] || 0,
        is_bookmarked: bookmarkSet.has(post.id),
      }));

      return { posts: enrichedPosts, users, communities };
    },
    enabled: query.length >= 2,
  });
};
