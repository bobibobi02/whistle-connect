import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/theme';

export function ModQueueScreen() {
  // Note: Implement full mod queue here
  // - View reported posts/comments
  // - Approve/remove content
  // - View removal reasons

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mod Queue</Text>
      
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>✅</Text>
        <Text style={styles.emptyText}>Queue is empty</Text>
        <Text style={styles.emptySubtext}>
          Reported content and posts needing review will appear here
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
});
