import { useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { Post } from './usePosts';

const CACHE_KEYS = {
  POSTS: 'whistle_cached_posts',
  LAST_UPDATED: 'whistle_cache_timestamp',
} as const;

const CACHE_DURATION_MS = 1000 * 60 * 60; // 1 hour

export const useOfflineCache = () => {
  const queryClient = useQueryClient();

  // Save posts to cache
  const cachePosts = useCallback(async (posts: Post[]) => {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.POSTS, JSON.stringify(posts));
      await AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATED, Date.now().toString());
    } catch (error) {
      console.error('Failed to cache posts:', error);
    }
  }, []);

  // Load posts from cache
  const loadCachedPosts = useCallback(async (): Promise<Post[] | null> => {
    try {
      const [postsJson, timestamp] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEYS.POSTS),
        AsyncStorage.getItem(CACHE_KEYS.LAST_UPDATED),
      ]);

      if (!postsJson) return null;

      // Check if cache is expired
      if (timestamp) {
        const cacheAge = Date.now() - parseInt(timestamp, 10);
        if (cacheAge > CACHE_DURATION_MS) {
          // Cache expired, but still return it for offline use
          console.log('Cache expired but returning for offline use');
        }
      }

      return JSON.parse(postsJson);
    } catch (error) {
      console.error('Failed to load cached posts:', error);
      return null;
    }
  }, []);

  // Check network status
  const checkIsOnline = useCallback(async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }, []);

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([CACHE_KEYS.POSTS, CACHE_KEYS.LAST_UPDATED]);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }, []);

  return {
    cachePosts,
    loadCachedPosts,
    checkIsOnline,
    clearCache,
  };
};

// Hook to use cached data when offline
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? true);
    });

    return () => unsubscribe();
  }, []);

  return isOnline;
};

import { useState } from 'react';
