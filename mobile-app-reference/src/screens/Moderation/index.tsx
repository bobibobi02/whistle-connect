import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { theme } from '@/theme';
import { RootStackParamList } from '@/navigation/types';

type ModerationRouteProp = RouteProp<RootStackParamList, 'Moderation'>;

export function ModerationScreen() {
  const route = useRoute<ModerationRouteProp>();
  const { communityId } = route.params;

  // Note: Implement full moderation tools here
  // - Ban/mute users
  // - Manage flairs
  // - View mod log
  // - Edit community settings

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Community Moderation</Text>
      <Text style={styles.subtitle}>Community ID: {communityId}</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛡️ Mod Tools Coming Soon</Text>
        <Text style={styles.description}>
          Full moderation capabilities including:
          {'\n'}• Ban/Mute users
          {'\n'}• Manage post flairs
          {'\n'}• View moderation log
          {'\n'}• Edit community rules
          {'\n'}• Approve/remove posts
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xl,
  },
  section: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  description: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
});
