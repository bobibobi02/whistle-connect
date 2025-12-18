import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '@/theme';
import { usePosts } from '@/hooks/usePosts';
import { PostCard } from '@/components/PostCard';
import { RootStackParamList } from '@/navigation/types';

type SortOption = 'best' | 'hot' | 'new';

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: '🔥 Hot', value: 'hot' },
  { label: '⭐ Best', value: 'best' },
  { label: '🆕 New', value: 'new' },
];

export function HomeScreen() {
  const [sort, setSort] = useState<SortOption>('hot');
  const { data: posts, isLoading, refetch, isRefetching } = usePosts(sort);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.sortContainer}>
        {SORT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.sortButton, sort === option.value && styles.sortButtonActive]}
            onPress={() => setSort(option.value)}
          >
            <Text
              style={[
                styles.sortButtonText,
                sort === option.value && styles.sortButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={styles.searchButton}
        onPress={() => navigation.navigate('Search', {})}
      >
        <Text style={styles.searchIcon}>🔍</Text>
      </TouchableOpacity>
    </View>
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
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>Be the first to post something!</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sortContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  sortButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.card,
  },
  sortButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  sortButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  sortButtonTextActive: {
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
  },
  searchButton: {
    padding: theme.spacing.sm,
  },
  searchIcon: {
    fontSize: 20,
  },
  listContent: {
    flexGrow: 1,
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
  emptyText: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
});
