import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AnonymousSubmission {
  id: string;
  submission_token: string;
  category: string;
  subject: string;
  content: string;
  file_urls: string[];
  target_community: string | null;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  reviewer?: {
    username: string | null;
    display_name: string | null;
  };
}

export interface SubmissionResponse {
  id: string;
  submission_id: string;
  responder_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  responder?: {
    username: string | null;
    display_name: string | null;
  };
}

export type SubmissionCategory = 
  | 'general'
  | 'corruption'
  | 'fraud'
  | 'safety'
  | 'environment'
  | 'workplace'
  | 'privacy'
  | 'other';

export const SUBMISSION_CATEGORIES: { value: SubmissionCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'corruption', label: 'Corruption' },
  { value: 'fraud', label: 'Fraud' },
  { value: 'safety', label: 'Safety Concern' },
  { value: 'environment', label: 'Environmental' },
  { value: 'workplace', label: 'Workplace Issue' },
  { value: 'privacy', label: 'Privacy Violation' },
  { value: 'other', label: 'Other' },
];

// Hook for admins/mods to view all submissions
export const useSubmissions = (status?: string) => {
  return useQuery({
    queryKey: ["anonymous-submissions", status],
    queryFn: async () => {
      let query = supabase
        .from("anonymous_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error } = await query.limit(100);

      if (error) {
        if (import.meta.env.DEV) {
          console.warn("[Submissions] Fetch error:", error.message);
        }
        throw error;
      }

      // Fetch reviewer profiles
      const reviewerIds = [...new Set((data || []).filter(s => s.reviewed_by).map(s => s.reviewed_by))];
      let reviewerMap = new Map<string, { username: string | null; display_name: string | null }>();
      
      if (reviewerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name")
          .in("user_id", reviewerIds);
        
        profiles?.forEach(p => reviewerMap.set(p.user_id, p));
      }

      return (data || []).map(s => ({
        ...s,
        reviewer: s.reviewed_by ? reviewerMap.get(s.reviewed_by) || null : null
      })) as AnonymousSubmission[];
    },
  });
};

// Hook for anonymous users to submit tips (no auth required)
export const useCreateSubmission = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      category,
      subject,
      content,
      fileUrls,
      targetCommunity,
    }: {
      category: string;
      subject: string;
      content: string;
      fileUrls?: string[];
      targetCommunity?: string;
    }) => {
      // Validate inputs
      if (!subject.trim() || subject.length > 200) {
        throw new Error("Subject must be between 1-200 characters");
      }
      if (!content.trim() || content.length > 10000) {
        throw new Error("Content must be between 1-10000 characters");
      }

      const { data, error } = await supabase
        .from("anonymous_submissions")
        .insert({
          category,
          subject: subject.trim(),
          content: content.trim(),
          file_urls: fileUrls || [],
          target_community: targetCommunity || null,
        })
        .select("submission_token")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Submission received",
        description: `Your anonymous submission has been received. Token: ${data.submission_token.slice(0, 8)}...`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Hook for admins/mods to update submission status
export const useUpdateSubmission = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      submissionId,
      status,
      priority,
      notes,
    }: {
      submissionId: string;
      status?: string;
      priority?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (status) {
        updates.status = status;
        if (status === 'resolved' || status === 'dismissed') {
          updates.reviewed_by = user.id;
          updates.reviewed_at = new Date().toISOString();
        }
      }
      if (priority) updates.priority = priority;
      if (notes !== undefined) updates.notes = notes;

      const { error } = await supabase
        .from("anonymous_submissions")
        .update(updates)
        .eq("id", submissionId);

      if (error) throw error;

      // Log to audit
      await supabase.from("audit_logs").insert({
        actor_id: user.id,
        action: `update_submission_${status || 'details'}`,
        target_type: "submission",
        target_id: submissionId,
        details: { status, priority },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anonymous-submissions"] });
      toast({ title: "Submission updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Hook for admins/mods to add responses
export const useSubmissionResponses = (submissionId: string) => {
  return useQuery({
    queryKey: ["submission-responses", submissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submission_responses")
        .select("*")
        .eq("submission_id", submissionId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch responder profiles
      const responderIds = [...new Set((data || []).map(r => r.responder_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name")
        .in("user_id", responderIds);

      const profileMap = new Map<string, { username: string | null; display_name: string | null }>();
      profiles?.forEach(p => profileMap.set(p.user_id, p));

      return (data || []).map(r => ({
        ...r,
        responder: profileMap.get(r.responder_id) || null,
      })) as SubmissionResponse[];
    },
    enabled: !!submissionId,
  });
};

export const useCreateResponse = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      submissionId,
      content,
      isInternal,
    }: {
      submissionId: string;
      content: string;
      isInternal: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!content.trim()) throw new Error("Response content is required");

      const { error } = await supabase
        .from("submission_responses")
        .insert({
          submission_id: submissionId,
          responder_id: user.id,
          content: content.trim(),
          is_internal: isInternal,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["submission-responses", variables.submissionId] });
      toast({ title: "Response added" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add response",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Stats hook for dashboard
export const useSubmissionStats = () => {
  return useQuery({
    queryKey: ["submission-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anonymous_submissions")
        .select("status, priority");

      if (error) {
        if (import.meta.env.DEV) {
          console.warn("[SubmissionStats] Error:", error.message);
        }
        return { pending: 0, reviewing: 0, resolved: 0, dismissed: 0, urgent: 0, total: 0 };
      }

      const stats = {
        pending: 0,
        reviewing: 0,
        resolved: 0,
        dismissed: 0,
        urgent: 0,
        total: data?.length || 0,
      };

      data?.forEach(s => {
        if (s.status === 'pending') stats.pending++;
        if (s.status === 'reviewing') stats.reviewing++;
        if (s.status === 'resolved') stats.resolved++;
        if (s.status === 'dismissed') stats.dismissed++;
        if (s.priority === 'urgent') stats.urgent++;
      });

      return stats;
    },
  });
};
