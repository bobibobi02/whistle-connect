import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@notification_sound_settings';

export interface NotificationSoundSettings {
  enabled: boolean;
  volume: number;
  soundType: 'default' | 'chime' | 'bell' | 'pop' | 'none';
  vibrate: boolean;
  // Per-type settings
  comments: boolean;
  upvotes: boolean;
  followers: boolean;
  mentions: boolean;
  moderation: boolean;
}

const DEFAULT_SETTINGS: NotificationSoundSettings = {
  enabled: true,
  volume: 0.7,
  soundType: 'default',
  vibrate: true,
  comments: true,
  upvotes: true,
  followers: true,
  mentions: true,
  moderation: true,
};

export const useNotificationSoundSettings = () => {
  const [settings, setSettings] = useState<NotificationSoundSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from storage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
        }
      } catch (error) {
        console.error('Failed to load notification sound settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Save settings to storage
  const saveSettings = useCallback(async (newSettings: Partial<NotificationSoundSettings>) => {
    try {
      const updated = { ...settings, ...newSettings };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSettings(updated);
    } catch (error) {
      console.error('Failed to save notification sound settings:', error);
      throw error;
    }
  }, [settings]);

  // Toggle master sound
  const toggleSound = useCallback(() => {
    saveSettings({ enabled: !settings.enabled });
  }, [settings.enabled, saveSettings]);

  // Toggle vibration
  const toggleVibrate = useCallback(() => {
    saveSettings({ vibrate: !settings.vibrate });
  }, [settings.vibrate, saveSettings]);

  // Set sound type
  const setSoundType = useCallback((soundType: NotificationSoundSettings['soundType']) => {
    saveSettings({ soundType });
  }, [saveSettings]);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    saveSettings({ volume: Math.max(0, Math.min(1, volume)) });
  }, [saveSettings]);

  // Toggle per-type setting
  const toggleTypeSound = useCallback((type: keyof Pick<NotificationSoundSettings, 'comments' | 'upvotes' | 'followers' | 'mentions' | 'moderation'>) => {
    saveSettings({ [type]: !settings[type] });
  }, [settings, saveSettings]);

  // Check if sound should play for a notification type
  const shouldPlaySound = useCallback((type: string): boolean => {
    if (!settings.enabled || settings.soundType === 'none') return false;

    const typeMap: Record<string, keyof Pick<NotificationSoundSettings, 'comments' | 'upvotes' | 'followers' | 'mentions' | 'moderation'>> = {
      'comment': 'comments',
      'reply': 'comments',
      'upvote': 'upvotes',
      'post_upvote': 'upvotes',
      'comment_upvote': 'upvotes',
      'follow': 'followers',
      'new_follower': 'followers',
      'mention': 'mentions',
      'mod_action': 'moderation',
      'report': 'moderation',
    };

    const settingKey = typeMap[type.toLowerCase()];
    return settingKey ? settings[settingKey] : settings.enabled;
  }, [settings]);

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    isLoading,
    toggleSound,
    toggleVibrate,
    setSoundType,
    setVolume,
    toggleTypeSound,
    shouldPlaySound,
    resetToDefaults,
    saveSettings,
  };
};

export default useNotificationSoundSettings;
