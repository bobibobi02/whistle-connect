import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.whistle.connect',
  appName: 'Whistle',
  webDir: 'dist',
  server: {
    // For development: point to your Lovable preview URL
    // Comment out for production builds
    url: 'https://856f8f4a-52f9-4355-8af6-22a21abcc85e.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    // Deep link configuration
    CapacitorHttp: {
      enabled: true,
    },
  },
  // iOS specific configuration
  ios: {
    scheme: 'whistle',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
  // Android specific configuration
  android: {
    allowMixedContent: true,
  },
};

export default config;
