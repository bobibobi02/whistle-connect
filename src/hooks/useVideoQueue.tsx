import { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Post } from "@/hooks/usePosts";

interface VideoQueueState {
  queueIds: string[];
  currentIndex: number;
  source: string;
}

const STORAGE_KEY = "whistle_video_queue";

export const useVideoQueue = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [autoplayEnabled, setAutoplayEnabled] = useState(() => {
    const saved = localStorage.getItem("whistle_autoplay_enabled");
    return saved !== null ? saved === "true" : true;
  });

  // Get queue state from session storage
  const getQueueState = useCallback((): VideoQueueState | null => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  // Set queue state
  const setQueueState = useCallback((state: VideoQueueState) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, []);

  // Initialize queue with video posts from feed
  const initializeQueue = useCallback(
    (posts: Post[], currentPostId: string, source = "feed") => {
      const videoPosts = posts.filter((p) => p.video_url && !p.live_url);
      const queueIds = videoPosts.map((p) => p.id);
      const currentIndex = queueIds.indexOf(currentPostId);

      if (currentIndex !== -1) {
        setQueueState({ queueIds, currentIndex, source });
      }
    },
    [setQueueState]
  );

  // Get current position in queue
  const getCurrentPosition = useCallback(() => {
    const state = getQueueState();
    if (!state) return null;
    return {
      index: state.currentIndex,
      total: state.queueIds.length,
      hasNext: state.currentIndex < state.queueIds.length - 1,
      hasPrevious: state.currentIndex > 0,
    };
  }, [getQueueState]);

  // Navigate to next video
  const goToNextVideo = useCallback(() => {
    const state = getQueueState();
    if (!state || state.currentIndex >= state.queueIds.length - 1) {
      return null;
    }

    const nextIndex = state.currentIndex + 1;
    const nextPostId = state.queueIds[nextIndex];

    setQueueState({ ...state, currentIndex: nextIndex });
    navigate(`/post/${nextPostId}`, { replace: true });
    return nextPostId;
  }, [getQueueState, setQueueState, navigate]);

  // Navigate to previous video
  const goToPreviousVideo = useCallback(() => {
    const state = getQueueState();
    if (!state || state.currentIndex <= 0) {
      return null;
    }

    const prevIndex = state.currentIndex - 1;
    const prevPostId = state.queueIds[prevIndex];

    setQueueState({ ...state, currentIndex: prevIndex });
    navigate(`/post/${prevPostId}`, { replace: true });
    return prevPostId;
  }, [getQueueState, setQueueState, navigate]);

  // Get next video ID for preloading
  const getNextVideoId = useCallback(() => {
    const state = getQueueState();
    if (!state || state.currentIndex >= state.queueIds.length - 1) {
      return null;
    }
    return state.queueIds[state.currentIndex + 1];
  }, [getQueueState]);

  // Toggle autoplay
  const toggleAutoplay = useCallback(() => {
    setAutoplayEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem("whistle_autoplay_enabled", String(newValue));
      return newValue;
    });
  }, []);

  // Clear queue
  const clearQueue = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Only handle on post detail pages
      if (!location.pathname.startsWith("/post/")) return;

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        goToNextVideo();
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        goToPreviousVideo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [location.pathname, goToNextVideo, goToPreviousVideo]);

  return {
    initializeQueue,
    goToNextVideo,
    goToPreviousVideo,
    getNextVideoId,
    getCurrentPosition,
    autoplayEnabled,
    toggleAutoplay,
    clearQueue,
  };
};
