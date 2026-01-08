import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBookmarks } from '@/hooks/useBookmarks';
import { PostCard } from '@/components/PostCard';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/theme';
import { Post } from '@/hooks/usePosts';

export default function BookmarksScreen() {
  const { user } = useAuth();
  const {
    data,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBookmarks();

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];

  const handlePostPress = (post: Post) => {
    if (post.video_url) {
      router.push(`/video/${post.id}`);
    } else {
      router.push(`/post/${post.id}`);
    }
  };

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="bookmark-outline" size={64} color={theme.colors.textMuted} />
        <Text style={styles.emptyTitle}>Sign in to save posts</Text>
        <Text style={styles.emptyText}>
          Bookmark posts to read them later
        </Text>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard post={item} onPress={() => handlePostPress(item)} />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Saved Posts</Text>
            <Text style={styles.subtitle}>{posts.length} saved</Text>
          </View>
        }
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={64} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No saved posts yet</Text>
            <Text style={styles.emptyText}>
              Bookmark posts to see them here
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
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
  listContent: {
    paddingBottom: theme.spacing.xl,
    flexGrow: 1,
  },
  header: {
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.text,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  signInButton: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
  },
  signInButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
});
