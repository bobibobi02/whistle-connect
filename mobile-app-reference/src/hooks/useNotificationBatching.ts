import { useMemo } from 'react';
import { Notification } from './useNotifications';

export interface BatchedNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  count: number;
  actors: string[];
  actorIds: string[];
  latestDate: string;
  relatedPostId: string | null;
  relatedCommentId: string | null;
  read: boolean;
  originalNotifications: Notification[];
}

// Group notifications by type and target within a time window
const BATCH_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export const batchNotifications = (notifications: Notification[]): BatchedNotification[] => {
  if (!notifications || notifications.length === 0) return [];

  const batches = new Map<string, BatchedNotification>();
  const standalone: BatchedNotification[] = [];

  // Types that can be batched
  const batchableTypes = ['upvote', 'post_upvote', 'comment_upvote', 'follow', 'new_follower'];

  for (const notification of notifications) {
    const isBatchable = batchableTypes.some(type => 
      notification.type.toLowerCase().includes(type)
    );

    if (!isBatchable) {
      // Non-batchable notifications stay as-is
      standalone.push({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message || '',
        count: 1,
        actors: [],
        actorIds: notification.actor_id ? [notification.actor_id] : [],
        latestDate: notification.created_at,
        relatedPostId: notification.related_post_id,
        relatedCommentId: notification.related_comment_id,
        read: notification.read,
        originalNotifications: [notification],
      });
      continue;
    }

    // Create batch key based on type and target
    const batchKey = `${notification.type}-${notification.related_post_id || ''}-${notification.related_comment_id || ''}`;

    if (batches.has(batchKey)) {
      const existing = batches.get(batchKey)!;
      const existingDate = new Date(existing.latestDate).getTime();
      const currentDate = new Date(notification.created_at).getTime();

      // Only batch within time window
      if (Math.abs(existingDate - currentDate) <= BATCH_WINDOW_MS) {
        existing.count++;
        if (notification.actor_id && !existing.actorIds.includes(notification.actor_id)) {
          existing.actorIds.push(notification.actor_id);
        }
        if (new Date(notification.created_at) > new Date(existing.latestDate)) {
          existing.latestDate = notification.created_at;
        }
        existing.read = existing.read && notification.read;
        existing.originalNotifications.push(notification);
        continue;
      }
    }

    // Start new batch
    batches.set(batchKey, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message || '',
      count: 1,
      actors: [],
      actorIds: notification.actor_id ? [notification.actor_id] : [],
      latestDate: notification.created_at,
      relatedPostId: notification.related_post_id,
      relatedCommentId: notification.related_comment_id,
      read: notification.read,
      originalNotifications: [notification],
    });
  }

  // Convert batches to array and generate titles
  const batchedArray = Array.from(batches.values()).map(batch => {
    if (batch.count > 1) {
      batch.title = generateBatchTitle(batch);
      batch.message = generateBatchMessage(batch);
    }
    return batch;
  });

  // Combine and sort by date
  const allNotifications = [...batchedArray, ...standalone];
  allNotifications.sort((a, b) => 
    new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
  );

  return allNotifications;
};

const generateBatchTitle = (batch: BatchedNotification): string => {
  const type = batch.type.toLowerCase();

  if (type.includes('upvote') || type.includes('post_upvote')) {
    return `${batch.count} people upvoted your post`;
  }

  if (type.includes('comment_upvote')) {
    return `${batch.count} people upvoted your comment`;
  }

  if (type.includes('follow') || type.includes('new_follower')) {
    return `${batch.count} new followers`;
  }

  return `${batch.count} ${batch.type} notifications`;
};

const generateBatchMessage = (batch: BatchedNotification): string => {
  const type = batch.type.toLowerCase();
  const count = batch.count;

  if (type.includes('upvote')) {
    return `Your content received ${count} upvotes`;
  }

  if (type.includes('follow')) {
    return `${count} people started following you`;
  }

  return `${count} new notifications`;
};

export const useBatchedNotifications = (notifications: Notification[] | undefined) => {
  return useMemo(() => {
    if (!notifications) return [];
    return batchNotifications(notifications);
  }, [notifications]);
};

export default useBatchedNotifications;
