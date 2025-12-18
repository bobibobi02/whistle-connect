import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { theme } from '@/theme';
import { supabase } from '@/config/supabase';
import { useQuery } from '@tanstack/react-query';
import { RootStackParamList } from '@/navigation/types';

type UserProfileRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;

export function UserProfileScreen() {
  const route = useRoute<UserProfileRouteProp>();
  const { userId } = route.params;

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {profile.display_name?.[0] || profile.username?.[0] || '?'}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.displayName}>
          {profile.display_name || profile.username || 'Anonymous'}
        </Text>
        <Text style={styles.username}>u/{profile.username || 'unknown'}</Text>
        
        {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
      </View>

      {/* Note: Add user's posts list here similar to Profile screen */}
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>User's posts will appear here</Text>
      </View>
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
    alignItems: 'center',
    padding: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatarContainer: {
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
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
  },
});
