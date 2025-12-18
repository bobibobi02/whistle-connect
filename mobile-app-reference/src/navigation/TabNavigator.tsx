import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { MainTabParamList } from './types';
import { useNotifications } from '@/hooks/useNotifications';

// Screens
import { HomeScreen } from '@/screens/Home';
import { CommunitiesScreen } from '@/screens/Communities';
import { CreatePostScreen } from '@/screens/CreatePost';
import { NotificationsScreen } from '@/screens/Notifications';
import { ProfileScreen } from '@/screens/Profile';

// Icons (using simple text for now - replace with actual icons)
const TabIcon = ({ name, focused, badge }: { name: string; focused: boolean; badge?: number }) => (
  <View style={styles.iconContainer}>
    <Text style={[styles.icon, focused && styles.iconFocused]}>{name}</Text>
    {badge && badge > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
      </View>
    )}
  </View>
);

const Tab = createBottomTabNavigator<MainTabParamList>();

export function TabNavigator() {
  const { unreadCount } = useNotifications();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        headerStyle: { backgroundColor: theme.colors.card },
        headerTintColor: theme.colors.text,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="🏠" focused={focused} />,
          title: 'Whistle',
        }}
      />
      <Tab.Screen
        name="Communities"
        component={CommunitiesScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="👥" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="✏️" focused={focused} />,
          title: 'Create',
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="🔔" focused={focused} badge={unreadCount} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
  },
  icon: {
    fontSize: 24,
    opacity: 0.6,
  },
  iconFocused: {
    opacity: 1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: theme.colors.text,
    fontSize: 10,
    fontWeight: '600',
  },
});
