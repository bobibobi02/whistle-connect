import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type FeedEventType = 
  | "impression"
  | "view_start"
  | "view_complete"
  | "watch_time"
  | "like"
  | "comment"
  | "share"
  | "save"
  | "follow_creator"
  | "not_interested"
  | "report"
  | "skip";

interface TrackEventOptions {
  postId: string;
  eventType: FeedEventType;
  watchTimeMs?: number;
  videoDurationMs?: number;
  metadata?: Record<string, any>;
}

export const useFeedEvents = () => {
  const { user } = useAuth();
  const pendingEvents = useRef<TrackEventOptions[]>([]);
  const flushTimeout = useRef<NodeJS.Timeout | null>(null);

  const flushEvents = useCallback(async () => {
    if (!user || pendingEvents.current.length === 0) return;

    const events = [...pendingEvents.current];
    pendingEvents.current = [];

    try {
      const rows = events.map((e) => ({
        user_id: user.id,
        post_id: e.postId,
        event_type: e.eventType,
        watch_time_ms: e.watchTimeMs ?? null,
        video_duration_ms: e.videoDurationMs ?? null,
        metadata: e.metadata ?? null,
      }));

      await supabase.from("feed_events").insert(rows);
    } catch (error) {
      console.error("Failed to track feed events:", error);
    }
  }, [user]);

  const trackEvent = useCallback(
    (options: TrackEventOptions) => {
      if (!user) return;

      pendingEvents.current.push(options);

      // Batch events and flush after 2 seconds of inactivity
      if (flushTimeout.current) {
        clearTimeout(flushTimeout.current);
      }
      flushTimeout.current = setTimeout(flushEvents, 2000);

      // Immediately flush if we have many events
      if (pendingEvents.current.length >= 10) {
        flushEvents();
      }
    },
    [user, flushEvents]
  );

  const trackImmediately = useCallback(
    async (options: TrackEventOptions) => {
      if (!user) return;

      try {
        await supabase.from("feed_events").insert({
          user_id: user.id,
          post_id: options.postId,
          event_type: options.eventType,
          watch_time_ms: options.watchTimeMs ?? null,
          video_duration_ms: options.videoDurationMs ?? null,
          metadata: options.metadata ?? null,
        });
      } catch (error) {
        console.error("Failed to track feed event:", error);
      }
    },
    [user]
  );

  return { trackEvent, trackImmediately, flushEvents };
};
