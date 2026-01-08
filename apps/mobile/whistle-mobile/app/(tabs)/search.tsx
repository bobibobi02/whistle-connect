import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSearch, SearchPost, SearchUser, SearchCommunity } from '@/hooks/useSearch';
import { PostCard } from '@/components/PostCard';
import { theme } from '@/theme';

type SectionData = 
  | { type: 'user'; data: SearchUser }
  | { type: 'community'; data: SearchCommunity }
  | { type: 'post'; data: SearchPost };

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading } = useSearch(debouncedQuery);

  const sections = useMemo(() => {
    if (!results) return [];

    const sectionList: { title: string; data: SectionData[] }[] = [];

    if (results.users.length > 0) {
      sectionList.push({
        title: 'Users',
        data: results.users.map((u) => ({ type: 'user' as const, data: u })),
      });
    }

    if (results.communities.length > 0) {
      sectionList.push({
        title: 'Communities',
        data: results.communities.map((c) => ({ type: 'community' as const, data: c })),
      });
    }

    if (results.posts.length > 0) {
      sectionList.push({
        title: 'Posts',
        data: results.posts.map((p) => ({ type: 'post' as const, data: p })),
      });
    }

    return sectionList;
  }, [results]);

  const renderItem = ({ item }: { item: SectionData }) => {
    if (item.type === 'user') {
      const user = item.data;
      return (
        <TouchableOpacity
          style={styles.userItem}
          onPress={() => router.push(`/user/${user.user_id}`)}
        >
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={20} color={theme.colors.textMuted} />
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.displayName}>
              {user.display_name || user.username || 'Anonymous'}
            </Text>
            {user.username && (
              <Text style={styles.username}>u/{user.username}</Text>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    if (item.type === 'community') {
      const community = item.data;
      return (
        <TouchableOpacity
          style={styles.communityItem}
          onPress={() => {/* TODO: Navigate to community */}}
        >
          <View style={styles.communityIcon}>
            <Text style={styles.communityIconText}>{community.icon || '💬'}</Text>
          </View>
          <View style={styles.communityInfo}>
            <Text style={styles.communityName}>w/{community.name}</Text>
            <Text style={styles.communityMeta}>
              {community.member_count ?? 0} members
            </Text>
            {community.description && (
              <Text style={styles.communityDescription} numberOfLines={1}>
                {community.description}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    // Post
    const post = item.data as SearchPost;
    return (
      <PostCard
        post={{
          ...post,
          author: {
            username: post.author_username || null,
            display_name: post.author_display_name || null,
            avatar_url: null,
          },
        } as any}
        onPress={() => router.push(`/post/${post.id}`)}
      />
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users, communities, posts..."
          placeholderTextColor={theme.colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading && debouncedQuery ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => {
            if (item.type === 'user') return `user-${item.data.user_id}`;
            if (item.type === 'community') return `community-${item.data.id}`;
            return `post-${item.data.id}`;
          }}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ListEmptyComponent={
            debouncedQuery ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No results found</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="search" size={48} color={theme.colors.textMuted} />
                <Text style={styles.emptyText}>Search for users, communities, or posts</Text>
              </View>
            )
          }
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xl,
  },
  sectionHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  username: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  communityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  communityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityIconText: {
    fontSize: 20,
  },
  communityInfo: {
    flex: 1,
  },
  communityName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  communityMeta: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  communityDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
