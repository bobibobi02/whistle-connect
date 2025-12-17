import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export const useProfile = (userId: string) => {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

export const useProfileByUsername = (username: string) => {
  return useQuery({
    queryKey: ["profile", "username", username],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!username,
  });
};

export const useUserPosts = (userId: string) => {
  return useQuery({
    queryKey: ["userPosts", userId],
    queryFn: async () => {
      const { data: posts, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!posts) return [];

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("user_id", userId)
        .maybeSingle();

      // Fetch comment counts
      const postIds = posts.map(p => p.id);
      const { data: commentCounts } = await supabase
        .from("comments")
        .select("post_id")
        .in("post_id", postIds);

      const countMap: Record<string, number> = {};
      commentCounts?.forEach(c => {
        countMap[c.post_id] = (countMap[c.post_id] || 0) + 1;
      });

      // Get flairs
      const flairIds = [...new Set(posts.filter(p => p.flair_id).map(p => p.flair_id))];
      let flairMap: Record<string, { id: string; name: string; color: string; background_color: string }> = {};
      if (flairIds.length > 0) {
        const { data: flairs } = await supabase
          .from("community_flairs")
          .select("id, name, color, background_color")
          .in("id", flairIds);

        flairs?.forEach((f) => {
          flairMap[f.id] = f;
        });
      }

      return posts.map(post => ({
        ...post,
        author: profile || { username: null, display_name: null, avatar_url: null },
        comment_count: countMap[post.id] || 0,
        user_vote: null,
        is_locked: post.is_locked ?? false,
        is_pinned: post.is_pinned ?? false,
        is_removed: post.is_removed ?? false,
        flair_id: post.flair_id || null,
        flair: post.flair_id ? flairMap[post.flair_id] || null : null,
      }));
    },
    enabled: !!userId,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      userId,
      username,
      display_name,
      bio,
      avatar_url,
    }: {
      userId: string;
      username?: string;
      display_name?: string;
      bio?: string;
      avatar_url?: string;
    }) => {
      const updates: Record<string, string | undefined> = {};
      if (username !== undefined) updates.username = username;
      if (display_name !== undefined) updates.display_name = display_name;
      if (bio !== undefined) updates.bio = bio;
      if (avatar_url !== undefined) updates.avatar_url = avatar_url;

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        if (error.code === "23505" && error.message.includes("username")) {
          throw new Error("This username is already taken");
        }
        throw error;
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["profile", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["profile", "username"] });
      toast({ title: "Profile updated!" });
    },
    onError: (error) => {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
