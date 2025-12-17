import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useRemovedContent = () => {
  return useQuery({
    queryKey: ["removed-content"],
    queryFn: async () => {
      const [postsRes, commentsRes] = await Promise.all([
        supabase
          .from("posts")
          .select("id, title, content, community, removed_at, removal_reason, removed_by, user_id")
          .eq("is_removed", true)
          .order("removed_at", { ascending: false })
          .limit(50),
        supabase
          .from("comments")
          .select("id, content, post_id, removed_at, removal_reason, removed_by, user_id")
          .eq("is_removed", true)
          .order("removed_at", { ascending: false })
          .limit(50)
      ]);

      return {
        posts: postsRes.data || [],
        comments: commentsRes.data || []
      };
    },
  });
};

export const useApprovePost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ postId, communityName }: { postId: string; communityName: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("posts")
        .update({
          is_removed: false,
          removed_by: null,
          removed_at: null,
          removal_reason: null
        })
        .eq("id", postId);

      if (error) throw error;

      // Log to audit
      await supabase.from("audit_logs").insert({
        actor_id: user.id,
        action: 'approve_post',
        target_type: 'post',
        target_id: postId,
        details: { community: communityName }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["removed-content"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast({ title: "Post restored" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
};

export const useApproveComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ commentId, communityName }: { commentId: string; communityName: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("comments")
        .update({
          is_removed: false,
          removed_by: null,
          removed_at: null,
          removal_reason: null
        })
        .eq("id", commentId);

      if (error) throw error;

      // Log to audit
      await supabase.from("audit_logs").insert({
        actor_id: user.id,
        action: 'approve_comment',
        target_type: 'comment',
        target_id: commentId,
        details: { community: communityName }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["removed-content"] });
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      toast({ title: "Comment restored" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
};
