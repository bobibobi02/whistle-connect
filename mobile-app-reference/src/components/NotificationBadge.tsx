import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '@/theme';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/hooks/useAuth';

interface NotificationBadgeProps {
  count?: number;
  size?: 'small' | 'medium' | 'large';
  showZero?: boolean;
  animated?: boolean;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count: propCount,
  size = 'medium',
  showZero = false,
  animated = true,
}) => {
  const { user } = useAuth();
  const [count, setCount] = useState(propCount ?? 0);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  // Use prop count if provided, otherwise fetch from DB
  useEffect(() => {
    if (propCount !== undefined) {
      setCount(propCount);
      return;
    }

    if (!user) {
      setCount(0);
      return;
    }

    // Fetch initial count
    const fetchCount = async () => {
      const { count: unreadCount, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (!error && unreadCount !== null) {
        setCount(unreadCount);
      }
    };

    fetchCount();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('notification-badge')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, propCount]);

  // Animate badge when count changes
  useEffect(() => {
    if (animated && count > 0) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [count, animated, scaleAnim]);

  if (count === 0 && !showZero) {
    return null;
  }

  const sizeStyles = {
    small: { minWidth: 14, height: 14, fontSize: 8, paddingHorizontal: 3 },
    medium: { minWidth: 18, height: 18, fontSize: 10, paddingHorizontal: 4 },
    large: { minWidth: 22, height: 22, fontSize: 12, paddingHorizontal: 5 },
  };

  const { minWidth, height, fontSize, paddingHorizontal } = sizeStyles[size];
  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          minWidth,
          height,
          paddingHorizontal,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Text style={[styles.badgeText, { fontSize }]}>{displayCount}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: theme.colors.error || '#ef4444',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.card,
  },
  badgeText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

export default NotificationBadge;
