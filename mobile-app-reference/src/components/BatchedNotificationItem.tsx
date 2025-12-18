import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { theme } from '@/theme';
import { BatchedNotification } from '@/hooks/useNotificationBatching';

// Enable layout animation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface BatchedNotificationItemProps {
  notification: BatchedNotification;
  onPress: (notification: BatchedNotification) => void;
  onLongPress: (notification: BatchedNotification) => void;
  onMarkAsRead: (notificationIds: string[]) => void;
}

export const BatchedNotificationItem: React.FC<BatchedNotificationItemProps> = ({
  notification,
  onPress,
  onLongPress,
  onMarkAsRead,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isBatched = notification.count > 1;

  const handlePress = () => {
    if (isBatched) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsExpanded(!isExpanded);
    } else {
      onPress(notification);
    }
  };

  const handleExpandedItemPress = (original: BatchedNotification['originalNotifications'][0]) => {
    onPress({
      ...notification,
      id: original.id,
      relatedPostId: original.related_post_id,
      relatedCommentId: original.related_comment_id,
    });
  };

  const getNotificationIcon = (type: string, count?: number) => {
    if (count && count > 1) {
      if (type.includes('upvote')) return '🔥';
      if (type.includes('follow')) return '👥';
    }

    switch (type.toLowerCase()) {
      case 'comment':
      case 'reply':
        return '💬';
      case 'upvote':
      case 'post_upvote':
      case 'comment_upvote':
        return '⬆️';
      case 'follow':
      case 'new_follower':
        return '👤';
      case 'mention':
        return '@';
      case 'mod_action':
        return '🛡️';
      default:
        return '🔔';
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.notificationItem, !notification.read && styles.unread]}
        onPress={handlePress}
        onLongPress={() => onLongPress(notification)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.notificationIcon}>
            {getNotificationIcon(notification.type, notification.count)}
          </Text>
          {isBatched && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {notification.count > 99 ? '99+' : notification.count}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          {notification.message && (
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {notification.message}
            </Text>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.notificationTime}>
              {formatDistanceToNow(new Date(notification.latestDate), { addSuffix: true })}
            </Text>
            {isBatched && (
              <Text style={styles.expandHint}>
                {isExpanded ? 'Tap to collapse' : 'Tap to expand'}
              </Text>
            )}
          </View>
        </View>

        {!notification.read && <View style={styles.unreadDot} />}
        
        {isBatched && (
          <Text style={styles.expandArrow}>{isExpanded ? '▼' : '▶'}</Text>
        )}
      </TouchableOpacity>

      {/* Expanded items */}
      {isExpanded && isBatched && (
        <View style={styles.expandedContainer}>
          {notification.originalNotifications.slice(0, 10).map((original, index) => (
            <TouchableOpacity
              key={original.id}
              style={[
                styles.expandedItem,
                !original.read && styles.expandedUnread,
                index === notification.originalNotifications.length - 1 && styles.lastExpandedItem,
              ]}
              onPress={() => handleExpandedItemPress(original)}
            >
              <Text style={styles.expandedIcon}>
                {getNotificationIcon(original.type)}
              </Text>
              <View style={styles.expandedContent}>
                <Text style={styles.expandedTitle} numberOfLines={1}>
                  {original.title}
                </Text>
                <Text style={styles.expandedTime}>
                  {formatDistanceToNow(new Date(original.created_at), { addSuffix: true })}
                </Text>
              </View>
              {!original.read && <View style={styles.smallUnreadDot} />}
            </TouchableOpacity>
          ))}
          
          {notification.originalNotifications.length > 10 && (
            <View style={styles.moreIndicator}>
              <Text style={styles.moreText}>
                +{notification.originalNotifications.length - 10} more
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.markAllReadButton}
            onPress={() => onMarkAsRead(notification.originalNotifications.map(n => n.id))}
          >
            <Text style={styles.markAllReadText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
  },
  unread: {
    backgroundColor: theme.colors.card,
  },
  iconContainer: {
    position: 'relative',
    marginRight: theme.spacing.md,
  },
  notificationIcon: {
    fontSize: 24,
  },
  countBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  countText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationTime: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  expandHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  expandArrow: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginLeft: theme.spacing.sm,
  },
  expandedContainer: {
    backgroundColor: theme.colors.card,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.primary,
    marginLeft: theme.spacing.xl,
  },
  expandedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  expandedUnread: {
    backgroundColor: `${theme.colors.primary}10`,
  },
  lastExpandedItem: {
    borderBottomWidth: 0,
  },
  expandedIcon: {
    fontSize: 16,
    marginRight: theme.spacing.md,
  },
  expandedContent: {
    flex: 1,
  },
  expandedTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  expandedTime: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  smallUnreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  moreIndicator: {
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  moreText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  markAllReadButton: {
    padding: theme.spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  markAllReadText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.link,
    fontWeight: theme.fontWeight.medium,
  },
});

export default BatchedNotificationItem;
