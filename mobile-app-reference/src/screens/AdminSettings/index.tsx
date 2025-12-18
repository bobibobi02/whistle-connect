import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/theme';

export function AdminSettingsScreen() {
  // Note: Implement admin-only settings here
  // - Site-wide announcements
  // - User management
  // - Global bans
  // - Feature flags

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Settings</Text>
      
      <View style={styles.warningBanner}>
        <Text style={styles.warningIcon}>⚠️</Text>
        <Text style={styles.warningText}>
          Admin-only area. Changes here affect the entire platform.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔧 Admin Tools Coming Soon</Text>
        <Text style={styles.description}>
          Site-wide administration features including:
          {'\n'}• Global user management
          {'\n'}• Platform-wide bans
          {'\n'}• Site announcements
          {'\n'}• Feature toggles
          {'\n'}• Analytics dashboard
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
    marginBottom: theme.spacing.lg,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning + '20',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  warningIcon: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  warningText: {
    flex: 1,
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
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
