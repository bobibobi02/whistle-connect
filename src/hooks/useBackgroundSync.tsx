import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface QueuedAction {
  id: string;
  type: 'vote' | 'bookmark' | 'comment' | 'follow' | 'mark_read';
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

const STORAGE_KEY = 'offline_action_queue';
const MAX_RETRIES = 3;

const getQueue = (): QueuedAction[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveQueue = (queue: QueuedAction[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
};

export const useBackgroundSync = () => {
  const { user } = useAuth();
  const isSyncingRef = useRef(false);
  const onlineRef = useRef(navigator.onLine);

  const processQueue = useCallback(async () => {
    if (!user || isSyncingRef.current || !navigator.onLine) return;
    
    isSyncingRef.current = true;
    const queue = getQueue();
    
    if (queue.length === 0) {
      isSyncingRef.current = false;
      return;
    }

    const failedActions: QueuedAction[] = [];
    let successCount = 0;

    for (const action of queue) {
      try {
        await executeAction(action, user.id);
        successCount++;
      } catch (error) {
        console.error('Failed to sync action:', action, error);
        if (action.retries < MAX_RETRIES) {
          failedActions.push({ ...action, retries: action.retries + 1 });
        }
      }
    }

    saveQueue(failedActions);
    
    if (successCount > 0) {
      toast.success(`Synced ${successCount} offline action${successCount > 1 ? 's' : ''}`);
    }
    
    isSyncingRef.current = false;
  }, [user]);

  const executeAction = async (action: QueuedAction, userId: string) => {
    const { type, payload } = action;

    switch (type) {
      case 'vote': {
        const { postId, voteType, isRemove } = payload as { postId: string; voteType: number; isRemove?: boolean };
        if (isRemove) {
          await supabase.from('post_votes').delete().eq('post_id', postId).eq('user_id', userId);
        } else {
          await supabase.from('post_votes').upsert({
            post_id: postId,
            user_id: userId,
            vote_type: voteType,
          });
        }
        break;
      }
      case 'bookmark': {
        const { postId, isRemove } = payload as { postId: string; isRemove?: boolean };
        if (isRemove) {
          await supabase.from('bookmarks').delete().eq('post_id', postId).eq('user_id', userId);
        } else {
          await supabase.from('bookmarks').insert({ post_id: postId, user_id: userId });
        }
        break;
      }
      case 'follow': {
        const { targetUserId, isUnfollow } = payload as { targetUserId: string; isUnfollow?: boolean };
        if (isUnfollow) {
          await supabase.from('follows').delete().eq('follower_id', userId).eq('following_id', targetUserId);
        } else {
          await supabase.from('follows').insert({ follower_id: userId, following_id: targetUserId });
        }
        break;
      }
      case 'mark_read': {
        const { notificationId, markAll } = payload as { notificationId?: string; markAll?: boolean };
        if (markAll) {
          await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
        } else if (notificationId) {
          await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
        }
        break;
      }
      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  };

  const queueAction = useCallback((type: QueuedAction['type'], payload: Record<string, unknown>) => {
    const action: QueuedAction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };

    const queue = getQueue();
    
    // Check for duplicate/conflicting actions
    const existingIndex = queue.findIndex(a => 
      a.type === type && 
      JSON.stringify(a.payload) === JSON.stringify(payload)
    );
    
    if (existingIndex >= 0) {
      queue[existingIndex] = action;
    } else {
      queue.push(action);
    }
    
    saveQueue(queue);

    // Try to sync immediately if online
    if (navigator.onLine) {
      processQueue();
    } else {
      toast.info('Action queued - will sync when online');
    }

    return action.id;
  }, [processQueue]);

  const getQueueSize = useCallback(() => {
    return getQueue().length;
  }, []);

  const clearQueue = useCallback(() => {
    saveQueue([]);
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (!onlineRef.current) {
        onlineRef.current = true;
        toast.success('Back online!');
        processQueue();
      }
    };

    const handleOffline = () => {
      onlineRef.current = false;
      toast.warning('You\'re offline - actions will be synced later');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync on mount
    if (navigator.onLine) {
      processQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processQueue]);

  // Register for Background Sync API if available
  useEffect(() => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then((registration) => {
        // @ts-ignore - SyncManager types
        registration.sync?.register('background-sync').catch(console.error);
      });
    }
  }, []);

  return {
    queueAction,
    processQueue,
    getQueueSize,
    clearQueue,
    isOnline: navigator.onLine,
  };
};

export default useBackgroundSync;
