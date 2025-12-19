import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Custom storage adapter for Supabase that uses Capacitor Preferences
 * for native apps (secure storage) and localStorage for web.
 */
export const capacitorStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key });
      return value;
    }
    return localStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },
};

/**
 * Synchronous storage wrapper for Supabase client initialization.
 * Uses localStorage with a fallback mechanism that syncs with Capacitor Preferences.
 */
export const hybridStorage = {
  getItem(key: string): string | null {
    return localStorage.getItem(key);
  },

  setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
    // Also persist to Capacitor Preferences for native
    if (Capacitor.isNativePlatform()) {
      Preferences.set({ key, value }).catch(console.error);
    }
  },

  removeItem(key: string): void {
    localStorage.removeItem(key);
    // Also remove from Capacitor Preferences for native
    if (Capacitor.isNativePlatform()) {
      Preferences.remove({ key }).catch(console.error);
    }
  },
};

/**
 * Sync localStorage with Capacitor Preferences on app startup.
 * Call this once when the app initializes on native platforms.
 */
export const syncStorageFromPreferences = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;

  const supabaseKeys = [
    'sb-fzgtckfxntalxrwanhdn-auth-token',
    'supabase.auth.token',
  ];

  for (const key of supabaseKeys) {
    const { value } = await Preferences.get({ key });
    if (value && !localStorage.getItem(key)) {
      localStorage.setItem(key, value);
    }
  }
};
