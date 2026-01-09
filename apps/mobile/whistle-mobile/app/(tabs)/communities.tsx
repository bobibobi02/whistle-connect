import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCommunities, Community } from '@/hooks/useCommunities';
import { theme } from '@/theme';

type SortOption = 'popular' | 'name' | 'newest';

export default function CommunitiesScreen() {
  const { data: communities, isLoading, refetch, isRefetching } = useCommunities();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('popular');

  const filteredAndSortedCommunities = useMemo(() => {
    if (!communities) return [];

    let filtered = communities.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    );

    switch (sortBy) {
      case 'popular':
        return filtered.sort((a, b) => b.member_count - a.member_count);
      case 'name':
        return filtered.sort((a, b) => a.display_name.localeCompare(b.display_name));
      case 'newest':
        return filtered.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      default:
        return filtered;
    }
  }, [communities, searchQuery, sortBy]);

  const handleCommunityPress = (community: Community) => {
    router.push(`/community/${community.name}`);
  };

  const renderCommunityItem = ({ item }: { item: Community }) => (
    <TouchableOpacity
      style={styles.communityCard}
      onPress={() => handleCommunityPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{item.icon || '💬'}</Text>
      </View>
      <View style={styles.communityInfo}>
        <Text style={styles.communityName}>w/{item.name}</Text>
        <Text style={styles.displayName}>{item.display_name}</Text>
        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <Text style={styles.memberCount}>
          {item.member_count.toLocaleString()} member{item.member_count !== 1 ? 's' : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );

  const SortButton = ({ option, label }: { option: SortOption; label: string }) => (
    <TouchableOpacity
      style={[styles.sortButton, sortBy === option && styles.sortButtonActive]}
      onPress={() => setSortBy(option)}
    >
      <Text style={[styles.sortButtonText, sortBy === option && styles.sortButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search communities..."
          placeholderTextColor={theme.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <SortButton option="popular" label="Popular" />
        <SortButton option="name" label="A-Z" />
        <SortButton option="newest" label="Newest" />
      </View>

      {/* Communities List */}
      <FlatList
        data={filteredAndSortedCommunities}
        renderItem={renderCommunityItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No communities found' : 'No communities yet'}
            </Text>
          </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  sortButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
  },
  sortButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  sortButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  icon: {
    fontSize: 24,
  },
  communityInfo: {
    flex: 1,
  },
  communityName: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  displayName: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: '600',
    marginTop: 2,
  },
  description: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  memberCount: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  separator: {
    height: theme.spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 2,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
});
