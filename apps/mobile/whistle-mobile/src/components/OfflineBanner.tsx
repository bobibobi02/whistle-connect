import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus, useOfflineSync } from '@/hooks/useOfflineCache';
import { theme } from '@/theme';

export const OfflineBanner: React.FC = () => {
  const isOnline = useNetworkStatus();
  const { pendingCount, isSyncing } = useOfflineSync();
  const [showBanner, setShowBanner] = React.useState(false);
  const slideAnim = React.useRef(new Animated.Value(-50)).current;

  React.useEffect(() => {
    const shouldShow = !isOnline || pendingCount > 0;
    
    if (shouldShow && !showBanner) {
      setShowBanner(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (!shouldShow && showBanner) {
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowBanner(false));
    }
  }, [isOnline, pendingCount, showBanner]);

  if (!showBanner) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          backgroundColor: isOnline ? theme.colors.warning : theme.colors.error,
        },
      ]}
    >
      <Ionicons
        name={isOnline ? 'sync' : 'cloud-offline'}
        size={16}
        color={theme.colors.background}
      />
      <Text style={styles.text}>
        {!isOnline
          ? 'You are offline'
          : isSyncing
          ? 'Syncing changes...'
          : `${pendingCount} pending change${pendingCount !== 1 ? 's' : ''}`}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  text: {
    color: theme.colors.background,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
});
