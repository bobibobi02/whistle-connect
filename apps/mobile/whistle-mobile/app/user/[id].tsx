import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile, useUserPosts } from '@/hooks/useUserProfile';
import { useFollowCounts, useIsFollowing, useToggleFollow } from '@/hooks/useFollows';
import { PostCard } from '@/components/PostCard';
import { theme } from '@/theme';

export default function UserProfileScreen() {
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  
  const { data: profile, isLoading: isLoadingProfile } = useUserProfile(userId);
  const { data: followCounts } = useFollowCounts(userId);
  const { data: isFollowing } = useIsFollowing(userId);
  const toggleFollow = useToggleFollow();
  
  const {
    data: postsData,
    isLoading: isLoadingPosts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useUserPosts(userId);

  const posts = postsData?.pages.flatMap((page) => page.posts) ?? [];
  const isOwnProfile = currentUser?.id === userId;

  const handleFollowPress = () => {
    if (!userId) return;
    toggleFollow.mutate({ targetUserId: userId, isFollowing: isFollowing ?? false });
  };

  const handlePostPress = (post: any) => {
    if (post.video_url) {
      router.push(`/video/${post.id}`);
    } else {
      router.push(`/post/${post.id}`);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {profile?.avatar_url ? (
        <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={48} color={theme.colors.textMuted} />
        </View>
      )}
      
      <Text style={styles.displayName}>
        {profile?.display_name || profile?.username || 'Anonymous'}
      </Text>
      <Text style={styles.username}>@{profile?.username || 'anonymous'}</Text>
      
      {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
      
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{followCounts?.followers ?? 0}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{followCounts?.following ?? 0}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{posts.length}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
      </View>

      {!isOwnProfile && currentUser && (
        <TouchableOpacity
          style={[styles.followButton, isFollowing && styles.followingButton]}
          onPress={handleFollowPress}
          disabled={toggleFollow.isPending}
        >
          {toggleFollow.isPending ? (
            <ActivityIndicator size="small" color={theme.colors.text} />
          ) : (
            <Text style={styles.followButtonText}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.postsHeader}>
        <Text style={styles.postsTitle}>Posts</Text>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  };

  if (isLoadingProfile) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Profile',
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.text,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Profile',
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.text,
          }}
        />
        <View style={styles.emptyContainer}>
          <Ionicons name="person-circle" size={64} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>User not found</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: profile?.username ? `@${profile.username}` : 'Profile',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
        }}
      />
      <FlatList
        style={styles.container}
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard post={item} onPress={() => handlePostPress(item)} />
        )}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          isLoadingPosts ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          )
        }
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
      />
    </>
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
  header: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: theme.spacing.md,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  displayName: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  username: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  bio: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  followButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.lg,
    minWidth: 120,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  followButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  postsHeader: {
    width: '100%',
    paddingTop: theme.spacing.md,
  },
  postsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
  },
  footerLoader: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
});
