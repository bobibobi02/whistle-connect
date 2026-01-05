import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface Comment {
  id: string;
  content: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  upvotes: number;
  created_at: string;
  is_removed: boolean | null;
  author_username?: string;
  author_display_name?: string;
  author_avatar?: string;
  user_vote?: number;
  replies?: Comment[];
}

export const useComments = (postId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['comments', postId, user?.id],
    queryFn: async (): Promise<Comment[]> => {
      const { data: comments, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .or('is_removed.is.null,is_removed.eq.false')
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!comments) return [];

      // Enrich comments with author info
      const enrichedComments = await Promise.all(
        comments.map(async (comment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url')
            .eq('user_id', comment.user_id)
            .maybeSingle();

          // Get user vote if logged in
          let userVote = 0;
          if (user) {
            const { data: vote } = await supabase
              .from('comment_votes')
              .select('vote_type')
              .eq('comment_id', comment.id)
              .eq('user_id', user.id)
              .maybeSingle();
            userVote = vote?.vote_type ?? 0;
          }

          return {
            ...comment,
            author_username: profile?.username ?? 'Anonymous',
            author_display_name: profile?.display_name ?? profile?.username ?? 'Anonymous',
            author_avatar: profile?.avatar_url,
            user_vote: userVote,
          };
        })
      );

      // Build comment tree
      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      enrichedComments.forEach((comment) => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });

      enrichedComments.forEach((comment) => {
        const enrichedComment = commentMap.get(comment.id)!;
        if (comment.parent_id && commentMap.has(comment.parent_id)) {
          commentMap.get(comment.parent_id)!.replies!.push(enrichedComment);
        } else {
          rootComments.push(enrichedComment);
        }
      });

      return rootComments;
    },
    enabled: !!postId,
  });
};

export const useCreateComment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      content,
      parentId,
    }: {
      postId: string;
      content: string;
      parentId?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          content,
          user_id: user.id,
          parent_id: parentId ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['comment-count', variables.postId] });
    },
  });
};
