import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '@/theme';
import { useCommunity, useCommunityRules, useIsMember, useJoinCommunity, useLeaveCommunity } from '@/hooks/useCommunities';
import { usePosts } from '@/hooks/usePosts';
import { PostCard } from '@/components/PostCard';
import { RootStackParamList } from '@/navigation/types';

type CommunityRouteProp = RouteProp<RootStackParamList, 'Community'>;

export function CommunityScreen() {
  const route = useRoute<CommunityRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { communityName } = route.params;
  const [showRules, setShowRules] = useState(false);

  const { data: community, isLoading: loadingCommunity } = useCommunity(communityName);
  const { data: rules } = useCommunityRules(community?.id || '');
  const { data: posts, isLoading: loadingPosts, refetch, isRefetching } = usePosts('new', communityName);
  const { data: isMember } = useIsMember(community?.id);
  
  const joinCommunity = useJoinCommunity();
  const leaveCommunity = useLeaveCommunity();

  const handleToggleMembership = async () => {
    if (!community) return;
    
    if (isMember) {
      await leaveCommunity.mutateAsync(community.id);
    } else {
      await joinCommunity.mutateAsync(community.id);
    }
  };

  if (loadingCommunity) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!community) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Community not found</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.communityInfo}>
        <Text style={styles.icon}>{community.icon}</Text>
        <View style={styles.titleContainer}>
          <Text style={styles.name}>r/{community.name}</Text>
          <Text style={styles.members}>
            {community.member_count?.toLocaleString() ?? 0} members
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.joinButton, isMember && styles.leaveButton]}
          onPress={handleToggleMembership}
          disabled={joinCommunity.isPending || leaveCommunity.isPending}
        >
          <Text style={[styles.joinButtonText, isMember && styles.leaveButtonText]}>
            {isMember ? 'Joined' : 'Join'}
          </Text>
        </TouchableOpacity>
      </View>

      {community.description && (
        <Text style={styles.description}>{community.description}</Text>
      )}

      {/* Rules Section */}
      {rules && rules.length > 0 && (
        <TouchableOpacity
          style={styles.rulesToggle}
          onPress={() => setShowRules(!showRules)}
        >
          <Text style={styles.rulesToggleText}>
            📜 Community Rules ({rules.length})
          </Text>
          <Text style={styles.rulesToggleIcon}>{showRules ? '▲' : '▼'}</Text>
        </TouchableOpacity>
      )}

      {showRules && rules && (
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

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('Main', { 
          screen: 'CreatePost', 
          params: { communityName: community.name } 
        } as any)}
      >
        <Text style={styles.createButtonText}>+ Create Post</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
            showCommunity={false}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          loadingPosts ? (
            <ActivityIndicator color={theme.colors.primary} style={{ padding: theme.spacing.xl }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No posts yet</Text>
              <Text style={styles.emptySubtext}>Be the first to post!</Text>
            </View>
          )
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.lg,
  },
  header: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  communityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  icon: {
    fontSize: 48,
    marginRight: theme.spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  name: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  members: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  joinButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  leaveButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  joinButtonText: {
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
  },
  leaveButtonText: {
    color: theme.colors.textSecondary,
  },
  description: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  rulesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  rulesToggleText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  rulesToggleIcon: {
    color: theme.colors.textMuted,
  },
  rulesList: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  ruleItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  ruleNumber: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
    marginRight: theme.spacing.sm,
    width: 24,
  },
  ruleContent: {
    flex: 1,
  },
  ruleTitle: {
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
  },
  ruleDescription: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginTop: 2,
  },
  createButton: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  createButtonText: {
    color: theme.colors.link,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  emptyContainer: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
  emptySubtext: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
});
