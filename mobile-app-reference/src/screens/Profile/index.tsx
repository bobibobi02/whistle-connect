import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '@/theme';
import { useAuth } from '@/hooks/useAuth';
import { useBookmarks } from '@/hooks/useBookmarks';
import { PostCard } from '@/components/PostCard';
import { RootStackParamList } from '@/navigation/types';

type Tab = 'posts' | 'bookmarks';

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const { data: bookmarks, isLoading: loadingBookmarks } = useBookmarks();

  // Note: You'd need a useUserPosts hook similar to the web app
  // For now, we'll show bookmarks as the main content

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {profile?.display_name?.[0] || profile?.username?.[0] || '?'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.displayName}>
            {profile?.display_name || profile?.username || 'Anonymous'}
          </Text>
          <Text style={styles.username}>u/{profile?.username || 'unknown'}</Text>
          {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
          onPress={() => setActiveTab('posts')}
        >
          <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
            Posts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bookmarks' && styles.activeTab]}
          onPress={() => setActiveTab('bookmarks')}
        >
          <Text style={[styles.tabText, activeTab === 'bookmarks' && styles.activeTabText]}>
            Saved
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'bookmarks' ? (
        loadingBookmarks ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={bookmarks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PostCard
                post={item}
                onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No saved posts</Text>
                <Text style={styles.emptySubtext}>
                  Bookmark posts to see them here
                </Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Your posts will appear here</Text>
        </View>
      )}

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  userInfo: {
    alignItems: 'center',
  },
  displayName: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  username: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  bio: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  editButton: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editButtonText: {
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
  },
  settingsButton: {
    padding: theme.spacing.sm,
  },
  settingsIcon: {
    fontSize: 24,
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
  emptyText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  emptySubtext: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  signOutButton: {
    margin: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  signOutText: {
    color: theme.colors.error,
    fontWeight: theme.fontWeight.semibold,
  },
});
