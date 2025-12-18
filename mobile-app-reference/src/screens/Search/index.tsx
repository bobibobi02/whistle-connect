import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '@/theme';
import { useSearch } from '@/hooks/useSearch';
import { PostCard } from '@/components/PostCard';
import { RootStackParamList } from '@/navigation/types';

type Tab = 'posts' | 'communities';

export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const { data, isLoading } = useSearch(query);

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search posts and communities..."
          placeholderTextColor={theme.colors.textMuted}
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={() => setQuery('')}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {query.length >= 2 && (
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
              Posts ({data?.posts.length ?? 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'communities' && styles.activeTab]}
            onPress={() => setActiveTab('communities')}
          >
            <Text style={[styles.tabText, activeTab === 'communities' && styles.activeTabText]}>
              Communities ({data?.communities.length ?? 0})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 50 }} />
      ) : query.length < 2 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>Search Whistle</Text>
          <Text style={styles.emptySubtext}>
            Find posts, communities, and more
          </Text>
        </View>
      ) : activeTab === 'posts' ? (
        <FlatList
          data={data?.posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No posts found</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : (
        <FlatList
          data={data?.communities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.communityItem}
              onPress={() => navigation.navigate('Community', { communityName: item.name })}
            >
              <Text style={styles.communityIcon}>{item.icon}</Text>
              <View style={styles.communityInfo}>
                <Text style={styles.communityName}>r/{item.name}</Text>
                <Text style={styles.communityMembers}>
                  {item.member_count?.toLocaleString() ?? 0} members
                </Text>
                {item.description && (
                  <Text style={styles.communityDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No communities found</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  clearButton: {
    position: 'absolute',
    right: theme.spacing.xl,
    padding: theme.spacing.sm,
  },
  clearText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.lg,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
  },
  activeTabText: {
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
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
  noResults: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
  },
  noResultsText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
  },
  communityItem: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
  },
  communityIcon: {
    fontSize: 40,
    marginRight: theme.spacing.md,
  },
  communityInfo: {
    flex: 1,
  },
  communityName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  communityMembers: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  communityDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
});
