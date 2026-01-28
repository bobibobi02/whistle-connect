import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCallback, useRef } from "react";

export interface AnalyticsEvent {
  id: string;
  user_id: string | null;
  session_id: string | null;
  event_name: string;
  properties: Record<string, any>;
  ip_hash: string | null;
  user_agent: string | null;
  route: string | null;
  created_at: string;
}

// Get or create session ID
const getSessionId = () => {
  let sessionId = sessionStorage.getItem("whistle_session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("whistle_session_id", sessionId);
  }
  return sessionId;
};

export const useTrackEvent = () => {
  const { user } = useAuth();
  const lastEventRef = useRef<{ name: string; time: number }>({ name: "", time: 0 });

  const trackEvent = useCallback(async (
    eventName: string,
    properties: Record<string, any> = {}
  ) => {
    // Deduplicate rapid repeat events (same event within 1 second)
    const now = Date.now();
    if (lastEventRef.current.name === eventName && now - lastEventRef.current.time < 1000) {
      return;
    }
    lastEventRef.current = { name: eventName, time: now };

    try {
      await supabase.from("events").insert({
        user_id: user?.id || null,
        session_id: getSessionId(),
        event_name: eventName,
        properties,
        user_agent: navigator.userAgent,
        route: window.location.pathname,
      });
    } catch (error) {
      console.error("Failed to track event:", error);
    }
  }, [user?.id]);

  return { trackEvent };
};

export const useAnalyticsDashboard = (days: number = 30) => {
  return useQuery({
    queryKey: ["analytics-dashboard", days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get events in date range
      const { data: events, error } = await supabase
        .from("events")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculate metrics
      const uniqueUsers = new Set(events?.filter(e => e.user_id).map(e => e.user_id));
      const uniqueSessions = new Set(events?.filter(e => e.session_id).map(e => e.session_id));
      
      const eventCounts: Record<string, number> = {};
      events?.forEach(e => {
        eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1;
      });

      // Group by day
      const dailyData: Record<string, { users: Set<string>; events: number }> = {};
      events?.forEach(e => {
        const day = e.created_at.split("T")[0];
        if (!dailyData[day]) {
          dailyData[day] = { users: new Set(), events: 0 };
        }
        if (e.user_id) dailyData[day].users.add(e.user_id);
        dailyData[day].events++;
      });

      const dailyMetrics = Object.entries(dailyData)
        .map(([date, data]) => ({
          date,
          activeUsers: data.users.size,
          events: data.events,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalEvents: events?.length || 0,
        uniqueUsers: uniqueUsers.size,
        uniqueSessions: uniqueSessions.size,
        eventCounts,
        dailyMetrics,
        signups: eventCounts["signup_completed"] || 0,
        logins: eventCounts["login"] || 0,
        firstPosts: eventCounts["first_post"] || 0,
        firstComments: eventCounts["first_comment"] || 0,
        follows: eventCounts["follow"] || 0,
        boostClicks: eventCounts["boost_clicked"] || 0,
        adImpressions: eventCounts["ad_impression"] || 0,
        adClicks: eventCounts["ad_click"] || 0,
        reportsCreated: eventCounts["report_created"] || 0,
      };
    },
  });
};
