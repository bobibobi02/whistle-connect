import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CommunityModLog {
  id: string;
  community_id: string;
  mod_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  target_user_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
  mod?: {
    username: string | null;
    display_name: string | null;
  };
  target_user?: {
    username: string | null;
    display_name: string | null;
  };
}

export const useCommunityModLog = (communityId: string | undefined, limit: number = 50) => {
  return useQuery({
    queryKey: ["community-mod-log", communityId, limit],
    queryFn: async () => {
      if (!communityId) return [];
      
      const { data, error } = await supabase
        .from("community_mod_log")
        .select("*")
        .eq("community_id", communityId)
        .order("created_at", { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      // Fetch profiles for mods and target users
      const userIds = [...new Set([
        ...data.map(l => l.mod_id),
        ...data.filter(l => l.target_user_id).map(l => l.target_user_id!)
      ])];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name")
        .in("user_id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return data.map(log => ({
        ...log,
        mod: profileMap.get(log.mod_id) || null,
        target_user: log.target_user_id ? profileMap.get(log.target_user_id) || null : null
      })) as CommunityModLog[];
    },
    enabled: !!communityId,
  });
};

// Post moderation actions
export const useLockPost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      postId,
      communityId,
      locked
    }: {
      postId: string;
      communityId: string;
      locked: boolean;
    }) => {
      const { error } = await supabase
        .from("posts")
        .update({ is_locked: locked })
        .eq("id", postId);
      
      if (error) throw error;
      
      // Log the action
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("community_mod_log").insert({
          community_id: communityId,
          mod_id: user.id,
          action: locked ? "lock_post" : "unlock_post",
          target_type: "post",
          target_id: postId
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
      toast({ title: variables.locked ? "Post locked" : "Post unlocked" });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating post", description: error.message, variant: "destructive" });
    },
  });
};

export const usePinPost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      postId,
      communityId,
      pinned,
      pinPosition
    }: {
      postId: string;
      communityId: string;
      pinned: boolean;
      pinPosition?: number;
    }) => {
      const { error } = await supabase
        .from("posts")
        .update({ 
          is_pinned: pinned,
          pin_position: pinned ? (pinPosition || 1) : null
        })
        .eq("id", postId);
      
      if (error) throw error;
      
      // Log the action
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("community_mod_log").insert({
          community_id: communityId,
          mod_id: user.id,
          action: pinned ? "pin_post" : "unpin_post",
          target_type: "post",
          target_id: postId
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
      toast({ title: variables.pinned ? "Post pinned" : "Post unpinned" });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating post", description: error.message, variant: "destructive" });
    },
  });
};

export const useRemovePost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      postId,
      communityId,
      reason
    }: {
      postId: string;
      communityId: string;
      reason?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("posts")
        .update({ 
          is_removed: true,
          removed_by: user.id,
          removed_at: new Date().toISOString(),
          removal_reason: reason
        })
        .eq("id", postId);
      
      if (error) throw error;
      
      // Log the action
      await supabase.from("community_mod_log").insert({
        community_id: communityId,
        mod_id: user.id,
        action: "remove_post",
        target_type: "post",
        target_id: postId,
        details: { reason }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast({ title: "Post removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error removing post", description: error.message, variant: "destructive" });
    },
  });
};

export const useApprovePost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      postId,
      communityId
    }: {
      postId: string;
      communityId: string;
    }) => {
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
      
      // Log the action
      await supabase.from("community_mod_log").insert({
        community_id: communityId,
        mod_id: user.id,
        action: "approve_post",
        target_type: "post",
        target_id: postId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast({ title: "Post approved" });
    },
    onError: (error: Error) => {
      toast({ title: "Error approving post", description: error.message, variant: "destructive" });
    },
  });
};

// Comment moderation
export const useDistinguishComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      commentId,
      postId,
      communityId,
      distinguished
    }: {
      commentId: string;
      postId: string;
      communityId: string;
      distinguished: boolean;
    }) => {
      const { error } = await supabase
        .from("comments")
        .update({ is_distinguished: distinguished })
        .eq("id", commentId);
      
      if (error) throw error;
      
      // Log the action
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("community_mod_log").insert({
          community_id: communityId,
          mod_id: user.id,
          action: distinguished ? "distinguish_comment" : "undistinguish_comment",
          target_type: "comment",
          target_id: commentId
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.postId] });
      toast({ title: variables.distinguished ? "Comment distinguished" : "Comment undistinguished" });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating comment", description: error.message, variant: "destructive" });
    },
  });
};

export const useRemoveComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      commentId,
      postId,
      communityId,
      reason
    }: {
      commentId: string;
      postId: string;
      communityId: string;
      reason?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("comments")
        .update({ 
          is_removed: true,
          removed_by: user.id,
          removed_at: new Date().toISOString(),
          removal_reason: reason
        })
        .eq("id", commentId);
      
      if (error) throw error;
      
      // Log the action
      await supabase.from("community_mod_log").insert({
        community_id: communityId,
        mod_id: user.id,
        action: "remove_comment",
        target_type: "comment",
        target_id: commentId,
        details: { reason }
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.postId] });
      toast({ title: "Comment removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error removing comment", description: error.message, variant: "destructive" });
    },
  });
};

export const useApproveComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      commentId,
      postId,
      communityId
    }: {
      commentId: string;
      postId: string;
      communityId: string;
    }) => {
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
      
      // Log the action
      await supabase.from("community_mod_log").insert({
        community_id: communityId,
        mod_id: user.id,
        action: "approve_comment",
        target_type: "comment",
        target_id: commentId
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.postId] });
      toast({ title: "Comment approved" });
    },
    onError: (error: Error) => {
      toast({ title: "Error approving comment", description: error.message, variant: "destructive" });
    },
  });
};

// Set post flair
export const useSetPostFlair = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      postId,
      flairId
    }: {
      postId: string;
      flairId: string | null;
    }) => {
      const { error } = await supabase
        .from("posts")
        .update({ flair_id: flairId })
        .eq("id", postId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast({ title: "Post flair updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating flair", description: error.message, variant: "destructive" });
    },
  });
};
