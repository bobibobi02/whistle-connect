import { useState, useCallback } from 'react';
import { Post } from './usePosts';

interface VideoQueueState {
  queue: Post[];
  currentIndex: number;
}

export const useVideoQueue = () => {
  const [state, setState] = useState<VideoQueueState>({
    queue: [],
    currentIndex: 0,
  });

  const initializeQueue = useCallback((posts: Post[], startIndex: number = 0) => {
    // Filter to video posts only
    const videoPosts = posts.filter((post) => post.video_url);
    setState({
      queue: videoPosts,
      currentIndex: startIndex,
    });
  }, []);

  const getCurrentVideo = useCallback(() => {
    return state.queue[state.currentIndex] ?? null;
  }, [state]);

  const goToNext = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentIndex: Math.min(prev.currentIndex + 1, prev.queue.length - 1),
    }));
  }, []);

  const goToPrevious = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentIndex: Math.max(prev.currentIndex - 1, 0),
    }));
  }, []);

  const hasNext = state.currentIndex < state.queue.length - 1;
  const hasPrevious = state.currentIndex > 0;

  return {
    queue: state.queue,
    currentIndex: state.currentIndex,
    currentVideo: getCurrentVideo(),
    initializeQueue,
    goToNext,
    goToPrevious,
    hasNext,
    hasPrevious,
  };
};
