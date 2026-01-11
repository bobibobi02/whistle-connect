import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { Post } from './usePosts';

const CACHE_KEYS = {
  POSTS: 'whistle_cached_posts',
  BOOKMARKS: 'whistle_cached_bookmarks',
  COMMUNITIES: 'whistle_cached_communities',
  NOTIFICATIONS: 'whistle_cached_notifications',
  PROFILE: 'whistle_cached_profile',
  LAST_UPDATED: 'whistle_cache_timestamp',
  PENDING_ACTIONS: 'whistle_pending_actions',
} as const;

const CACHE_DURATION_MS = 1000 * 60 * 60; // 1 hour

export interface PendingAction {
  id: string;
  type: 'vote' | 'bookmark' | 'comment' | 'post';
  action: 'create' | 'update' | 'delete';
  data: Record<string, any>;
  timestamp: number;
}

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
          console.log('Cache expired but returning for offline use');
        }
      }

      return JSON.parse(postsJson);
    } catch (error) {
      console.error('Failed to load cached posts:', error);
      return null;
    }
  }, []);

  // Cache bookmarks
  const cacheBookmarks = useCallback(async (bookmarks: Post[]) => {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
    } catch (error) {
      console.error('Failed to cache bookmarks:', error);
    }
  }, []);

  const loadCachedBookmarks = useCallback(async (): Promise<Post[] | null> => {
    try {
      const json = await AsyncStorage.getItem(CACHE_KEYS.BOOKMARKS);
      return json ? JSON.parse(json) : null;
    } catch (error) {
      console.error('Failed to load cached bookmarks:', error);
      return null;
    }
  }, []);

  // Cache communities
  const cacheCommunities = useCallback(async (communities: any[]) => {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.COMMUNITIES, JSON.stringify(communities));
    } catch (error) {
      console.error('Failed to cache communities:', error);
    }
  }, []);

  const loadCachedCommunities = useCallback(async (): Promise<any[] | null> => {
    try {
      const json = await AsyncStorage.getItem(CACHE_KEYS.COMMUNITIES);
      return json ? JSON.parse(json) : null;
    } catch (error) {
      console.error('Failed to load cached communities:', error);
      return null;
    }
  }, []);

  // Cache notifications
  const cacheNotifications = useCallback(async (notifications: any[]) => {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    } catch (error) {
      console.error('Failed to cache notifications:', error);
    }
  }, []);

  const loadCachedNotifications = useCallback(async (): Promise<any[] | null> => {
    try {
      const json = await AsyncStorage.getItem(CACHE_KEYS.NOTIFICATIONS);
      return json ? JSON.parse(json) : null;
    } catch (error) {
      console.error('Failed to load cached notifications:', error);
      return null;
    }
  }, []);

  // Cache user profile
  const cacheProfile = useCallback(async (profile: any) => {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.PROFILE, JSON.stringify(profile));
    } catch (error) {
      console.error('Failed to cache profile:', error);
    }
  }, []);

  const loadCachedProfile = useCallback(async (): Promise<any | null> => {
    try {
      const json = await AsyncStorage.getItem(CACHE_KEYS.PROFILE);
      return json ? JSON.parse(json) : null;
    } catch (error) {
      console.error('Failed to load cached profile:', error);
      return null;
    }
  }, []);

  // Pending actions for offline sync
  const addPendingAction = useCallback(async (action: Omit<PendingAction, 'id' | 'timestamp'>) => {
    try {
      const existingJson = await AsyncStorage.getItem(CACHE_KEYS.PENDING_ACTIONS);
      const existing: PendingAction[] = existingJson ? JSON.parse(existingJson) : [];
      
      const newAction: PendingAction = {
        ...action,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };
      
      existing.push(newAction);
      await AsyncStorage.setItem(CACHE_KEYS.PENDING_ACTIONS, JSON.stringify(existing));
      return newAction.id;
    } catch (error) {
      console.error('Failed to add pending action:', error);
      return null;
    }
  }, []);

  const getPendingActions = useCallback(async (): Promise<PendingAction[]> => {
    try {
      const json = await AsyncStorage.getItem(CACHE_KEYS.PENDING_ACTIONS);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('Failed to get pending actions:', error);
      return [];
    }
  }, []);

  const removePendingAction = useCallback(async (actionId: string) => {
    try {
      const existingJson = await AsyncStorage.getItem(CACHE_KEYS.PENDING_ACTIONS);
      if (!existingJson) return;
      
      const existing: PendingAction[] = JSON.parse(existingJson);
      const filtered = existing.filter((a) => a.id !== actionId);
      await AsyncStorage.setItem(CACHE_KEYS.PENDING_ACTIONS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove pending action:', error);
    }
  }, []);

  const clearPendingActions = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.PENDING_ACTIONS);
    } catch (error) {
      console.error('Failed to clear pending actions:', error);
    }
  }, []);

  // Check network status
  const checkIsOnline = useCallback(async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }, []);

  // Clear all cache
  const clearCache = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove(Object.values(CACHE_KEYS));
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }, []);

  // Get cache size info
  const getCacheInfo = useCallback(async () => {
    try {
      const keys = Object.values(CACHE_KEYS);
      const sizes: Record<string, number> = {};
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        sizes[key] = value ? value.length : 0;
      }
      
      const totalBytes = Object.values(sizes).reduce((a, b) => a + b, 0);
      return {
        sizes,
        totalBytes,
        totalKB: Math.round(totalBytes / 1024),
      };
    } catch (error) {
      console.error('Failed to get cache info:', error);
      return { sizes: {}, totalBytes: 0, totalKB: 0 };
    }
  }, []);

  return {
    // Posts
    cachePosts,
    loadCachedPosts,
    // Bookmarks
    cacheBookmarks,
    loadCachedBookmarks,
    // Communities
    cacheCommunities,
    loadCachedCommunities,
    // Notifications
    cacheNotifications,
    loadCachedNotifications,
    // Profile
    cacheProfile,
    loadCachedProfile,
    // Pending actions
    addPendingAction,
    getPendingActions,
    removePendingAction,
    clearPendingActions,
    // Utilities
    checkIsOnline,
    clearCache,
    getCacheInfo,
  };
};

// Hook to track network status
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(state.isConnected ?? true);
    });

    return () => unsubscribe();
  }, []);

  return isOnline;
};

// Hook to sync pending actions when back online
export const useOfflineSync = () => {
  const { getPendingActions, removePendingAction, clearPendingActions } = useOfflineCache();
  const isOnline = useNetworkStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Check pending count on mount
  useEffect(() => {
    getPendingActions().then((actions) => setPendingCount(actions.length));
  }, [getPendingActions]);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      syncPendingActions();
    }
  }, [isOnline, pendingCount]);

  const syncPendingActions = useCallback(async () => {
    setIsSyncing(true);
    try {
      const actions = await getPendingActions();
      
      for (const action of actions) {
        try {
          // Process each action based on type
          // This would need to be implemented based on your specific needs
          console.log('Processing pending action:', action);
          await removePendingAction(action.id);
          setPendingCount((c) => Math.max(0, c - 1));
        } catch (error) {
          console.error('Failed to sync action:', action.id, error);
        }
      }
    } finally {
      setIsSyncing(false);
    }
  }, [getPendingActions, removePendingAction]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    syncPendingActions,
  };
};
