import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useCommunity,
  useCommunityRules,
  useCommunityMembership,
  useCommunityPosts,
  useJoinCommunity,
  useLeaveCommunity,
} from '@/hooks/useCommunities';
import { useShare } from '@/hooks/useShare';
import { useAuth } from '@/hooks/useAuth';
import { PostCard } from '@/components/PostCard';
import { theme } from '@/theme';

export default function CommunityScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { user } = useAuth();
  const { data: community, isLoading: communityLoading, refetch: refetchCommunity } = useCommunity(name);
  const { data: rules, isLoading: rulesLoading } = useCommunityRules(community?.id || '');
  const { data: isMember } = useCommunityMembership(community?.id || '');
  const {
    data: postsData,
    isLoading: postsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchPosts,
  } = useCommunityPosts(name);

  const joinCommunity = useJoinCommunity();
  const leaveCommunity = useLeaveCommunity();
  const { shareCommunity } = useShare();

  const [showRules, setShowRules] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const posts = postsData?.pages.flatMap((page) => page.data) || [];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchCommunity(), refetchPosts()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchCommunity, refetchPosts]);

  const handleJoinLeave = () => {
    if (!user || !community) return;
    if (isMember) {
      leaveCommunity.mutate(community.id);
    } else {
      joinCommunity.mutate(community.id);
    }
  };

  const handleShare = () => {
    if (community) {
      shareCommunity(community.name, community.display_name);
    }
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  if (communityLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!community) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>Community not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      {/* Community Info */}
      <View style={styles.communityHeader}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{community.icon || '💬'}</Text>
        </View>
        <View style={styles.communityInfo}>
          <Text style={styles.displayName}>{community.display_name}</Text>
          <Text style={styles.communityName}>w/{community.name}</Text>
        </View>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Description */}
      {community.description && (
        <Text style={styles.description}>{community.description}</Text>
      )}

      {/* Stats & Actions */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{community.member_count ?? 0}</Text>
          <Text style={styles.statLabel}>Members</Text>
        </View>
        {user && (
          <TouchableOpacity
            style={[styles.joinButton, isMember && styles.joinedButton]}
            onPress={handleJoinLeave}
            disabled={joinCommunity.isPending || leaveCommunity.isPending}
          >
            <Text style={[styles.joinButtonText, isMember && styles.joinedButtonText]}>
              {isMember ? 'Joined' : 'Join'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.createPostButton}
          onPress={() => router.push('/create-post')}
        >
          <Ionicons name="add" size={20} color={theme.colors.primary} />
          <Text style={styles.createPostText}>Post</Text>
        </TouchableOpacity>
      </View>

      {/* Rules Section */}
      {rules && rules.length > 0 && (
        <View style={styles.rulesSection}>
          <TouchableOpacity
            style={styles.rulesHeader}
            onPress={() => setShowRules(!showRules)}
          >
            <Text style={styles.rulesTitle}>Community Rules</Text>
            <Ionicons
              name={showRules ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
          {showRules && (
            <View style={styles.rulesList}>
              {rules.map((rule) => (
                <View key={rule.id} style={styles.ruleItem}>
                  <Text style={styles.ruleNumber}>{rule.rule_number}.</Text>
                  <View style={styles.ruleContent}>
                    <Text style={styles.ruleTitle}>{rule.title}</Text>
                    {rule.description && (
                      <Text style={styles.ruleDescription}>{rule.description}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Posts Header */}
      <View style={styles.postsHeader}>
        <Text style={styles.postsTitle}>Posts</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item as any}
            onPress={() => router.push(`/post/${item.id}`)}
          />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          postsLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No posts yet in this community</Text>
            </View>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : null
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        contentContainerStyle={styles.listContent}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  errorText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textMuted,
  },
  backButton: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  backButtonText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  headerContainer: {
    padding: theme.spacing.lg,
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  icon: {
    fontSize: 32,
  },
  communityInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  communityName: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
  },
  shareButton: {
    padding: theme.spacing.sm,
  },
  description: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  joinButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
  },
  joinedButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  joinButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },
  joinedButtonText: {
    color: theme.colors.textSecondary,
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginLeft: 'auto',
  },
  createPostText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  rulesSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
  },
  rulesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  rulesTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  rulesList: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  ruleItem: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  ruleNumber: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
    minWidth: 20,
  },
  ruleContent: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },
  ruleDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  postsHeader: {
    marginBottom: theme.spacing.sm,
  },
  postsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xl,
  },
  emptyContainer: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
  },
  footer: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
});
