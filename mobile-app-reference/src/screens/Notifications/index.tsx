import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatDistanceToNow } from 'date-fns';
import { theme } from '@/theme';
import { useNotifications, useMarkAsRead, useMarkAllAsRead, useDeleteNotification } from '@/hooks/useNotifications';
import { RootStackParamList } from '@/navigation/types';

export function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: notifications, isLoading, refetch, isRefetching, unreadCount } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  const handleNotificationPress = (notification: typeof notifications extends (infer U)[] ? U : never) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }

    // Navigate based on notification type
    if (notification.related_post_id) {
      navigation.navigate('PostDetail', { postId: notification.related_post_id });
    } else if (notification.link) {
      // Handle other links (e.g., profile)
      if (notification.link.startsWith('/profile/')) {
        const userId = notification.link.replace('/profile/', '');
        navigation.navigate('UserProfile', { userId });
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'comment':
      case 'reply':
        return '💬';
      case 'upvote':
        return '⬆️';
      case 'follow':
        return '👤';
      default:
        return '🔔';
    }
  };

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
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.notificationItem, !item.read && styles.unread]}
            onPress={() => handleNotificationPress(item)}
            onLongPress={() => deleteNotification.mutate(item.id)}
          >
            <Text style={styles.notificationIcon}>{getNotificationIcon(item.type)}</Text>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>{item.title}</Text>
              {item.message && (
                <Text style={styles.notificationMessage} numberOfLines={2}>
                  {item.message}
                </Text>
              )}
              <Text style={styles.notificationTime}>
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </Text>
            </View>
            {!item.read && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )}
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
  },
  markAllText: {
    color: theme.colors.link,
    fontSize: theme.fontSize.md,
    textAlign: 'center',
  },
  notificationItem: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  unread: {
    backgroundColor: theme.colors.card,
  },
  notificationIcon: {
    fontSize: 24,
    marginRight: theme.spacing.md,
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
  notificationTime: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginLeft: theme.spacing.sm,
    alignSelf: 'center',
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
    marginTop: 100,
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
