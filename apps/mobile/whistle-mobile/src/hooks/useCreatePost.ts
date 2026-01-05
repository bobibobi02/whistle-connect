import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { Alert } from 'react-native';

interface CreatePostInput {
  title: string;
  content?: string;
  image_url?: string;
  video_url?: string;
  community?: string;
  is_nsfw?: boolean;
}

export const useCreatePost = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      if (!user) throw new Error('Must be logged in to create a post');

      const { data, error } = await supabase
        .from('posts')
        .insert({
          title: input.title,
          content: input.content || null,
          image_url: input.image_url || null,
          video_url: input.video_url || null,
          community: input.community || 'general',
          is_nsfw: input.is_nsfw || false,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate all posts queries to refresh the feed
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.message || 'Failed to create post. Please try again.'
      );
    },
  });
};
