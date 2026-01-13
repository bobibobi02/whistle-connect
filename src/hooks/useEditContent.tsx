import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export const useEditPost = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      postId,
      title,
      content,
    }: {
      postId: string;
      title?: string;
      content?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Get current post for edit history
      const { data: currentPost, error: fetchError } = await supabase
        .from("posts")
        .select("title, content")
        .eq("id", postId)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;
      if (!currentPost) throw new Error("Post not found or you don't have permission to edit it");

      // Save edit history
      const { error: historyError } = await supabase
        .from("edit_history")
        .insert({
          content_type: "post",
          content_id: postId,
          previous_content: currentPost.content || "",
          previous_title: currentPost.title,
          edited_by: user.id,
        });

      if (historyError) throw historyError;

      // Update the post
      const updates: Record<string, any> = {
        is_edited: true,
        edited_at: new Date().toISOString(),
      };
      if (title !== undefined) updates.title = title;
      if (content !== undefined) updates.content = content;

      const { error: updateError } = await supabase
        .from("posts")
        .update(updates)
        .eq("id", postId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post"] });
      toast({
        title: "Post updated",
        description: "Your changes have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating post",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useEditComment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      commentId,
      postId,
      content,
    }: {
      commentId: string;
      postId: string;
      content: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Get current comment for edit history
      const { data: currentComment, error: fetchError } = await supabase
        .from("comments")
        .select("content")
        .eq("id", commentId)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;
      if (!currentComment) throw new Error("Comment not found or you don't have permission to edit it");

      // Save edit history
      const { error: historyError } = await supabase
        .from("edit_history")
        .insert({
          content_type: "comment",
          content_id: commentId,
          previous_content: currentComment.content,
          edited_by: user.id,
        });

      if (historyError) throw historyError;

      // Update the comment
      const { error: updateError } = await supabase
        .from("comments")
        .update({
          content,
          is_edited: true,
          edited_at: new Date().toISOString(),
        })
        .eq("id", commentId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      return { postId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["comments", data?.postId] });
      toast({
        title: "Comment updated",
        description: "Your changes have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating comment",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useEditHistory = (contentType: "post" | "comment", contentId: string) => {
  return {
    queryKey: ["edit-history", contentType, contentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("edit_history")
        .select("*")
        .eq("content_type", contentType)
        .eq("content_id", contentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  };
};
