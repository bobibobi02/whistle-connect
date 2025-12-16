import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ModerationLog {
  id: string;
  content_type: string;
  content_text: string;
  user_id: string;
  allowed: boolean;
  reason: string | null;
  created_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
  };
}

export const useModerationLogs = (limit = 50) => {
  return useQuery({
    queryKey: ["moderation-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moderation_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Fetch profiles for each log
      const userIds = [...new Set(data.map(log => log.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(log => ({
        ...log,
        profile: profileMap.get(log.user_id) || null
      })) as ModerationLog[];
    },
  });
};

export const useModerationStats = () => {
  return useQuery({
    queryKey: ["moderation-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moderation_logs")
        .select("allowed, content_type, created_at");

      if (error) throw error;

      const total = data.length;
      const flagged = data.filter(d => !d.allowed).length;
      const allowed = data.filter(d => d.allowed).length;
      const posts = data.filter(d => d.content_type === 'post').length;
      const comments = data.filter(d => d.content_type === 'comment').length;

      // Last 24 hours
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last24h = data.filter(d => new Date(d.created_at) > yesterday).length;
      const flaggedLast24h = data.filter(d => new Date(d.created_at) > yesterday && !d.allowed).length;

      return {
        total,
        flagged,
        allowed,
        posts,
        comments,
        last24h,
        flaggedLast24h,
        flagRate: total > 0 ? ((flagged / total) * 100).toFixed(1) : '0'
      };
    },
  });
};
