import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from './useAuth';

export interface Comment {
  id: string;
  content: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  upvotes: number;
  created_at: string;
  updated_at: string;
  is_distinguished?: boolean;
  is_removed?: boolean;
  author?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  user_vote?: number | null;
  replies?: Comment[];
}

export const useComments = (postId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['comments', postId, user?.id],
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .eq('is_removed', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!comments) return [];

      // Enrich comments with author and vote data
      const enrichedComments = await Promise.all(
        comments.map(async (comment) => {
          const { data: author } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url')
            .eq('user_id', comment.user_id)
            .single();

          let user_vote = null;
          if (user) {
            const { data: voteData } = await supabase
              .from('comment_votes')
              .select('vote_type')
              .eq('comment_id', comment.id)
              .eq('user_id', user.id)
              .maybeSingle();
            user_vote = voteData?.vote_type ?? null;
          }

          return {
            ...comment,
            author,
            user_vote,
          };
        })
      );

      // Build nested comment tree
      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      enrichedComments.forEach((comment) => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });

      enrichedComments.forEach((comment) => {
        const enrichedComment = commentMap.get(comment.id)!;
        if (comment.parent_id) {
          const parent = commentMap.get(comment.parent_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(enrichedComment);
          }
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
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
      if (!user) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          content,
          parent_id: parentId,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['post', variables.postId] });
    },
  });
};
