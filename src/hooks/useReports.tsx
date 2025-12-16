import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Report {
  id: string;
  reporter_id: string;
  content_type: 'post' | 'comment';
  post_id: string | null;
  comment_id: string | null;
  reason: string;
  details: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  reporter?: {
    username: string | null;
    display_name: string | null;
  };
  post?: {
    title: string;
    content: string | null;
  };
  comment?: {
    content: string;
  };
}

export const useReports = (status?: string) => {
  return useQuery({
    queryKey: ["reports", status],
    queryFn: async () => {
      let query = supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch related data
      const reporterIds = [...new Set(data.map(r => r.reporter_id))];
      const postIds = data.filter(r => r.post_id).map(r => r.post_id);
      const commentIds = data.filter(r => r.comment_id).map(r => r.comment_id);

      const [profilesRes, postsRes, commentsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, username, display_name").in("user_id", reporterIds),
        postIds.length > 0 ? supabase.from("posts").select("id, title, content").in("id", postIds) : { data: [] },
        commentIds.length > 0 ? supabase.from("comments").select("id, content").in("id", commentIds) : { data: [] }
      ]);

      const profileMap = new Map<string, any>();
      profilesRes.data?.forEach(p => profileMap.set(p.user_id, p));
      
      const postMap = new Map<string, any>();
      postsRes.data?.forEach(p => postMap.set(p.id, p));
      
      const commentMap = new Map<string, any>();
      commentsRes.data?.forEach(c => commentMap.set(c.id, c));

      return data.map(report => ({
        ...report,
        reporter: profileMap.get(report.reporter_id) || null,
        post: report.post_id ? postMap.get(report.post_id) || null : null,
        comment: report.comment_id ? commentMap.get(report.comment_id) || null : null
      })) as Report[];
    },
  });
};

export const useCreateReport = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      contentType,
      postId,
      commentId,
      reason,
      details
    }: {
      contentType: 'post' | 'comment';
      postId?: string;
      commentId?: string;
      reason: string;
      details?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("reports")
        .insert({
          reporter_id: user.id,
          content_type: contentType,
          post_id: postId || null,
          comment_id: commentId || null,
          reason,
          details: details || null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast({ title: "Report submitted", description: "Thank you for helping keep our community safe." });
    },
    onError: (error) => {
      toast({
        title: "Error submitting report",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

export const useUpdateReportStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      reportId,
      status,
      onAuditLog
    }: {
      reportId: string;
      status: 'reviewed' | 'resolved' | 'dismissed';
      onAuditLog?: () => void;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("reports")
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", reportId)
        .select()
        .single();

      if (error) throw error;
      
      // Log to audit
      await supabase.from("audit_logs").insert({
        actor_id: user.id,
        action: status === 'resolved' ? 'resolve_report' : 'dismiss_report',
        target_type: 'report',
        target_id: reportId,
        details: { status }
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast({ title: "Report updated" });
    },
    onError: (error) => {
      toast({
        title: "Error updating report",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

export const useDeleteReportedContent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      contentType,
      postId,
      commentId,
      reportId
    }: {
      contentType: 'post' | 'comment';
      postId?: string | null;
      commentId?: string | null;
      reportId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const targetId = contentType === 'post' ? postId : commentId;
      
      if (contentType === 'post' && postId) {
        // Get post details before deletion for audit log
        const { data: post } = await supabase
          .from("posts")
          .select("title")
          .eq("id", postId)
          .single();
          
        const { error } = await supabase
          .from("posts")
          .delete()
          .eq("id", postId);
        if (error) throw error;
        
        // Log to audit
        await supabase.from("audit_logs").insert({
          actor_id: user.id,
          action: 'delete_post',
          target_type: 'post',
          target_id: postId,
          details: { title: post?.title, report_id: reportId }
        });
      } else if (contentType === 'comment' && commentId) {
        // Get comment details before deletion for audit log
        const { data: comment } = await supabase
          .from("comments")
          .select("content")
          .eq("id", commentId)
          .single();
          
        const { error } = await supabase
          .from("comments")
          .delete()
          .eq("id", commentId);
        if (error) throw error;
        
        // Log to audit
        await supabase.from("audit_logs").insert({
          actor_id: user.id,
          action: 'delete_comment',
          target_type: 'comment',
          target_id: commentId,
          details: { content_preview: comment?.content?.slice(0, 100), report_id: reportId }
        });
      }

      // Mark report as resolved
      await supabase
        .from("reports")
        .update({
          status: 'resolved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", reportId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast({ title: "Content deleted", description: "The reported content has been removed." });
    },
    onError: (error) => {
      toast({
        title: "Error deleting content",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};
