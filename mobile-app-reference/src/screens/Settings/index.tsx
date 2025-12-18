import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '@/theme';
import { useAuth } from '@/hooks/useAuth';
import { useEmailPreferences, useUpdateEmailPreferences, useSnoozeNotifications, useUnsnoozeNotifications } from '@/hooks/useEmailPreferences';
import { useUserRoles, useIsAdmin, useIsModerator } from '@/hooks/useUserRoles';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNotificationSoundSettings } from '@/hooks/useNotificationSoundSettings';
import { RootStackParamList } from '@/navigation/types';

type SettingsNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ThemeMode = 'dark' | 'light' | 'system';

const SOUND_TYPES = [
  { value: 'default', label: 'Default', icon: '🔔' },
  { value: 'chime', label: 'Chime', icon: '🎵' },
  { value: 'bell', label: 'Bell', icon: '🔔' },
  { value: 'pop', label: 'Pop', icon: '💫' },
  { value: 'none', label: 'None', icon: '🔇' },
] as const;

export function SettingsScreen() {
  const navigation = useNavigation<SettingsNavigationProp>();
  const { user, signOut } = useAuth();
  const { data: preferences, isLoading: prefsLoading } = useEmailPreferences();
  const updatePreferences = useUpdateEmailPreferences();
  const snoozeNotifications = useSnoozeNotifications();
  const unsnoozeNotifications = useUnsnoozeNotifications();
  const { isAdmin } = useIsAdmin();
  const { isModerator } = useIsModerator();
  const { expoPushToken } = usePushNotifications();
  const {
    settings: soundSettings,
    isLoading: soundLoading,
    toggleSound,
    toggleVibrate,
    setSoundType,
    setVolume,
    toggleTypeSound,
  } = useNotificationSoundSettings();

  // Local state for theme (would be persisted in AsyncStorage in production)
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  // Check if notifications are snoozed
  const isSnoozed = preferences?.snooze_until && new Date(preferences.snooze_until) > new Date();

  const handleTogglePreference = async (key: keyof typeof preferences, value: boolean) => {
    try {
      await updatePreferences.mutateAsync({ [key]: value });
    } catch (error) {
      Alert.alert('Error', 'Failed to update preference');
    }
  };

  const handleSnooze = (hours: number) => {
    Alert.alert(
      'Snooze Notifications',
      `Snooze all notifications for ${hours} hour${hours > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Snooze',
          onPress: async () => {
            try {
              await snoozeNotifications.mutateAsync(hours);
              Alert.alert('Success', `Notifications snoozed for ${hours} hour${hours > 1 ? 's' : ''}`);
            } catch (error) {
              Alert.alert('Error', 'Failed to snooze notifications');
            }
          },
        },
      ]
    );
  };

  const handleUnsnooze = async () => {
    try {
      await unsnoozeNotifications.mutateAsync();
      Alert.alert('Success', 'Notifications unpaused');
    } catch (error) {
      Alert.alert('Error', 'Failed to unsnooze notifications');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your posts, comments, and data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Contact Support', 'Please contact support@whistle.app to delete your account.');
          },
        },
      ]
    );
  };

  if (prefsLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity
          style={styles.item}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <View style={styles.itemContent}>
            <Text style={styles.itemIcon}>👤</Text>
            <View>
              <Text style={styles.itemText}>Edit Profile</Text>
              <Text style={styles.itemSubtext}>Update your name, bio, and avatar</Text>
            </View>
          </View>
          <Text style={styles.itemArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.item}>
          <View style={styles.itemContent}>
            <Text style={styles.itemIcon}>📧</Text>
            <View>
              <Text style={styles.itemText}>Email</Text>
              <Text style={styles.itemSubtext}>{user?.email || 'Not set'}</Text>
            </View>
          </View>
        </View>

        {expoPushToken && (
          <View style={styles.item}>
            <View style={styles.itemContent}>
              <Text style={styles.itemIcon}>📱</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemText}>Push Token</Text>
                <Text style={styles.itemSubtext} numberOfLines={1}>
                  {expoPushToken.substring(0, 30)}...
                </Text>
              </View>
            </View>
            <Text style={styles.itemBadge}>✓</Text>
          </View>
        )}
      </View>

      {/* Theme Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>

        <TouchableOpacity
          style={[styles.item, themeMode === 'dark' && styles.itemSelected]}
          onPress={() => setThemeMode('dark')}
        >
          <View style={styles.itemContent}>
            <Text style={styles.itemIcon}>🌙</Text>
            <Text style={styles.itemText}>Dark Mode</Text>
          </View>
          {themeMode === 'dark' && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.item, themeMode === 'light' && styles.itemSelected]}
          onPress={() => setThemeMode('light')}
        >
          <View style={styles.itemContent}>
            <Text style={styles.itemIcon}>☀️</Text>
            <Text style={styles.itemText}>Light Mode</Text>
          </View>
          {themeMode === 'light' && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.item, themeMode === 'system' && styles.itemSelected]}
          onPress={() => setThemeMode('system')}
        >
          <View style={styles.itemContent}>
            <Text style={styles.itemIcon}>⚙️</Text>
            <Text style={styles.itemText}>System Default</Text>
          </View>
          {themeMode === 'system' && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Push Notifications</Text>

        {isSnoozed && (
          <TouchableOpacity style={styles.snoozeBanner} onPress={handleUnsnooze}>
            <Text style={styles.snoozeIcon}>🔕</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.snoozeText}>Notifications Snoozed</Text>
              <Text style={styles.snoozeSubtext}>
                Until {new Date(preferences?.snooze_until!).toLocaleTimeString()}
              </Text>
            </View>
            <Text style={styles.snoozeAction}>Unsnooze</Text>
          </TouchableOpacity>
        )}

        <View style={styles.item}>
          <View style={styles.itemContent}>
            <Text style={styles.itemIcon}>💬</Text>
            <Text style={styles.itemText}>Comments on Posts</Text>
          </View>
          <Switch
            value={preferences?.inapp_comment !== false}
            onValueChange={(value) => handleTogglePreference('inapp_comment', value)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.text}
          />
        </View>

        <View style={styles.item}>
          <View style={styles.itemContent}>
            <Text style={styles.itemIcon}>⬆️</Text>
            <Text style={styles.itemText}>Upvotes on Posts</Text>
          </View>
          <Switch
            value={preferences?.inapp_post_upvote !== false}
            onValueChange={(value) => handleTogglePreference('inapp_post_upvote', value)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.text}
          />
        </View>

        <View style={styles.item}>
          <View style={styles.itemContent}>
            <Text style={styles.itemIcon}>👥</Text>
            <Text style={styles.itemText}>New Followers</Text>
          </View>
          <Switch
            value={preferences?.inapp_new_follower !== false}
            onValueChange={(value) => handleTogglePreference('inapp_new_follower', value)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.text}
          />
      </View>

      {/* Sound Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Sounds</Text>

        <View style={styles.item}>
          <View style={styles.itemContent}>
            <Text style={styles.itemIcon}>🔊</Text>
            <Text style={styles.itemText}>Sound Enabled</Text>
          </View>
          <Switch
            value={soundSettings.enabled}
            onValueChange={toggleSound}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.text}
          />
        </View>

        <View style={styles.item}>
          <View style={styles.itemContent}>
            <Text style={styles.itemIcon}>📳</Text>
            <Text style={styles.itemText}>Vibration</Text>
          </View>
          <Switch
            value={soundSettings.vibrate}
            onValueChange={toggleVibrate}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.text}
          />
        </View>

        {soundSettings.enabled && (
          <>
            <View style={styles.volumeContainer}>
              <View style={styles.volumeHeader}>
                <Text style={styles.itemIcon}>🔈</Text>
                <Text style={styles.itemText}>Volume</Text>
                <Text style={styles.volumeValue}>{Math.round(soundSettings.volume * 100)}%</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                value={soundSettings.volume}
                onSlidingComplete={setVolume}
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.border}
                thumbTintColor={theme.colors.primary}
              />
            </View>

            <View style={styles.soundTypeContainer}>
              <Text style={styles.soundTypeLabel}>Sound Type</Text>
              <View style={styles.soundTypeOptions}>
                {SOUND_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.soundTypeOption,
                      soundSettings.soundType === type.value && styles.soundTypeOptionSelected,
                    ]}
                    onPress={() => setSoundType(type.value)}
                  >
                    <Text style={styles.soundTypeIcon}>{type.icon}</Text>
                    <Text
                      style={[
                        styles.soundTypeText,
                        soundSettings.soundType === type.value && styles.soundTypeTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.perTypeSoundsContainer}>
              <Text style={styles.perTypeSoundsLabel}>Sound by Notification Type</Text>

              <View style={styles.item}>
                <View style={styles.itemContent}>
                  <Text style={styles.itemIcon}>💬</Text>
                  <Text style={styles.itemText}>Comments</Text>
                </View>
                <Switch
                  value={soundSettings.comments}
                  onValueChange={() => toggleTypeSound('comments')}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={theme.colors.text}
                />
              </View>

              <View style={styles.item}>
                <View style={styles.itemContent}>
                  <Text style={styles.itemIcon}>⬆️</Text>
                  <Text style={styles.itemText}>Upvotes</Text>
                </View>
                <Switch
                  value={soundSettings.upvotes}
                  onValueChange={() => toggleTypeSound('upvotes')}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={theme.colors.text}
                />
              </View>

              <View style={styles.item}>
                <View style={styles.itemContent}>
                  <Text style={styles.itemIcon}>👥</Text>
                  <Text style={styles.itemText}>Followers</Text>
                </View>
                <Switch
                  value={soundSettings.followers}
                  onValueChange={() => toggleTypeSound('followers')}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={theme.colors.text}
                />
              </View>

              <View style={styles.item}>
                <View style={styles.itemContent}>
                  <Text style={styles.itemIcon}>@</Text>
                  <Text style={styles.itemText}>Mentions</Text>
                </View>
                <Switch
                  value={soundSettings.mentions}
                  onValueChange={() => toggleTypeSound('mentions')}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={theme.colors.text}
                />
              </View>

              <View style={styles.item}>
                <View style={styles.itemContent}>
                  <Text style={styles.itemIcon}>🛡️</Text>
                  <Text style={styles.itemText}>Moderation</Text>
                </View>
                <Switch
                  value={soundSettings.moderation}
                  onValueChange={() => toggleTypeSound('moderation')}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={theme.colors.text}
                />
              </View>
            </View>
          </>
        )}
      </View>

        <View style={styles.snoozeOptions}>
          <Text style={styles.snoozeLabel}>Snooze for:</Text>
          <View style={styles.snoozeButtons}>
            {[1, 2, 4, 8, 24].map((hours) => (
              <TouchableOpacity
                key={hours}
                style={styles.snoozeButton}
                onPress={() => handleSnooze(hours)}
              >
                <Text style={styles.snoozeButtonText}>{hours}h</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Email Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Email Notifications</Text>

        <View style={styles.item}>
          <View style={styles.itemContent}>
            <Text style={styles.itemIcon}>💬</Text>
            <Text style={styles.itemText}>Comments on Posts</Text>
          </View>
          <Switch
            value={preferences?.email_comment !== false}
            onValueChange={(value) => handleTogglePreference('email_comment', value)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.text}
          />
        </View>

        <View style={styles.item}>
          <View style={styles.itemContent}>
            <Text style={styles.itemIcon}>⬆️</Text>
            <Text style={styles.itemText}>Upvotes on Posts</Text>
          </View>
          <Switch
            value={preferences?.email_post_upvote === true}
            onValueChange={(value) => handleTogglePreference('email_post_upvote', value)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.text}
          />
        </View>

        <View style={styles.item}>
          <View style={styles.itemContent}>
            <Text style={styles.itemIcon}>👥</Text>
            <Text style={styles.itemText}>New Followers</Text>
          </View>
          <Switch
            value={preferences?.email_new_follower !== false}
            onValueChange={(value) => handleTogglePreference('email_new_follower', value)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.text}
          />
        </View>
      </View>

      {/* Moderation Section (only for mods/admins) */}
      {(isModerator || isAdmin) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Moderation</Text>

          <TouchableOpacity
            style={styles.item}
            onPress={() => navigation.navigate('ModQueue')}
          >
            <View style={styles.itemContent}>
              <Text style={styles.itemIcon}>🚨</Text>
              <Text style={styles.itemText}>Mod Queue</Text>
            </View>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.item}
            onPress={() => navigation.navigate('Moderation')}
          >
            <View style={styles.itemContent}>
              <Text style={styles.itemIcon}>🛡️</Text>
              <Text style={styles.itemText}>Moderation Tools</Text>
            </View>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              style={styles.item}
              onPress={() => navigation.navigate('AdminSettings')}
            >
              <View style={styles.itemContent}>
                <Text style={styles.itemIcon}>⚡</Text>
                <Text style={styles.itemText}>Admin Settings</Text>
              </View>
              <Text style={styles.itemArrow}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        <TouchableOpacity
          style={styles.item}
          onPress={() => Linking.openURL('https://whistle.app/privacy')}
        >
          <View style={styles.itemContent}>
            <Text style={styles.itemIcon}>🔒</Text>
            <Text style={styles.itemText}>Privacy Policy</Text>
          </View>
          <Text style={styles.itemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={() => Linking.openURL('https://whistle.app/terms')}
        >
          <View style={styles.itemContent}>
            <Text style={styles.itemIcon}>📜</Text>
            <Text style={styles.itemText}>Terms of Service</Text>
          </View>
          <Text style={styles.itemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={() => Linking.openURL('https://whistle.app/support')}
        >
          <View style={styles.itemContent}>
            <Text style={styles.itemIcon}>💡</Text>
            <Text style={styles.itemText}>Help & Support</Text>
          </View>
          <Text style={styles.itemArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.item}>
          <View style={styles.itemContent}>
            <Text style={styles.itemIcon}>📱</Text>
            <Text style={styles.itemText}>Version</Text>
          </View>
          <Text style={styles.itemValue}>1.0.0 (Build 1)</Text>
        </View>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with 💖 by Whistle Team</Text>
        <Text style={styles.footerSubtext}>© 2024 Whistle. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  dangerTitle: {
    color: theme.colors.error,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemSelected: {
    backgroundColor: `${theme.colors.primary}15`,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    fontSize: 20,
    marginRight: theme.spacing.md,
  },
  itemText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  itemSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  itemArrow: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.textMuted,
  },
  itemValue: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  itemBadge: {
    fontSize: 16,
    color: theme.colors.success,
  },
  checkmark: {
    fontSize: 18,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  snoozeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning + '20',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  snoozeIcon: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  snoozeText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
  },
  snoozeSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  snoozeAction: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  snoozeOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  snoozeLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  snoozeButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  snoozeButton: {
    backgroundColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  snoozeButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  signOutButton: {
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  signOutText: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  deleteButton: {
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.error + '10',
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.error + '30',
  },
  deleteText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  footer: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  footerSubtext: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    opacity: 0.7,
  },
  // Sound settings styles
  volumeContainer: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  volumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volumeValue: {
    marginLeft: 'auto',
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  slider: {
    marginTop: theme.spacing.sm,
    height: 40,
  },
  soundTypeContainer: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  soundTypeLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  soundTypeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  soundTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  soundTypeOptionSelected: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },
  soundTypeIcon: {
    fontSize: 14,
    marginRight: theme.spacing.xs,
  },
  soundTypeText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  soundTypeTextSelected: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  perTypeSoundsContainer: {
    backgroundColor: theme.colors.card,
    paddingTop: theme.spacing.md,
  },
  perTypeSoundsLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
});
