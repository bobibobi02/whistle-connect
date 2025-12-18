import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '@/theme';
import { 
  useNotifications, 
  useMarkAsRead, 
  useMarkAllAsRead, 
  useDeleteNotification,
  Notification,
} from '@/hooks/useNotifications';
import { useBatchedNotifications, BatchedNotification } from '@/hooks/useNotificationBatching';
import { BatchedNotificationItem } from '@/components/BatchedNotificationItem';
import { RootStackParamList } from '@/navigation/types';

export function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: notifications, isLoading, refetch, isRefetching, unreadCount } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  // Batch similar notifications
  const batchedNotifications = useBatchedNotifications(notifications);

  const handleNotificationPress = useCallback((notification: BatchedNotification) => {
    // Mark original notification(s) as read
    if (!notification.read) {
      notification.originalNotifications.forEach(n => {
        if (!n.read) {
          markAsRead.mutate(n.id);
        }
      });
    }

    // Navigate based on notification content
    if (notification.relatedPostId) {
      navigation.navigate('PostDetail', { 
        postId: notification.relatedPostId,
        highlightCommentId: notification.relatedCommentId || undefined,
      });
    } else if (notification.actorIds.length === 1) {
      // Single actor - navigate to their profile
      navigation.navigate('UserProfile', { userId: notification.actorIds[0] });
    }
  }, [navigation, markAsRead]);

  const handleLongPress = useCallback((notification: BatchedNotification) => {
    const options = [
      { text: 'Cancel', style: 'cancel' as const },
    ];

    if (!notification.read) {
      options.push({
        text: 'Mark as Read',
        style: 'default' as const,
        onPress: () => {
          notification.originalNotifications.forEach(n => {
            markAsRead.mutate(n.id);
          });
        },
      } as any);
    }

    options.push({
      text: 'Delete',
      style: 'destructive' as const,
      onPress: () => {
        notification.originalNotifications.forEach(n => {
          deleteNotification.mutate(n.id);
        });
      },
    } as any);

    Alert.alert('Notification Options', undefined, options);
  }, [markAsRead, deleteNotification]);

  const handleMarkBatchAsRead = useCallback((notificationIds: string[]) => {
    notificationIds.forEach(id => {
      markAsRead.mutate(id);
    });
  }, [markAsRead]);

  const renderNotification = useCallback(({ item }: { item: BatchedNotification }) => (
    <BatchedNotificationItem
      notification={item}
      onPress={handleNotificationPress}
      onLongPress={handleLongPress}
      onMarkAsRead={handleMarkBatchAsRead}
    />
  ), [handleNotificationPress, handleLongPress, handleMarkBatchAsRead]);

  const keyExtractor = useCallback((item: BatchedNotification) => item.id, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <TouchableOpacity
          style={styles.markAllButton}
          onPress={() => markAllAsRead.mutate()}
          disabled={markAllAsRead.isPending}
        >
          <Text style={styles.markAllText}>
            {markAllAsRead.isPending ? 'Marking...' : `Mark all ${unreadCount} as read`}
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={batchedNotifications}
        keyExtractor={keyExtractor}
        renderItem={renderNotification}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptySubtext}>
              When someone interacts with your posts or comments, you'll see it here.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={batchedNotifications.length === 0 ? styles.emptyList : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  markAllButton: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  markAllText: {
    color: theme.colors.link,
    fontSize: theme.fontSize.md,
    textAlign: 'center',
    fontWeight: theme.fontWeight.medium,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  emptyList: {
    flex: 1,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.lg,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
