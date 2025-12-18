import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/theme';
import { RootStackParamList } from './types';
import { TabNavigator } from './TabNavigator';

// Screens
import { AuthScreen } from '@/screens/Auth';
import { PostDetailScreen } from '@/screens/PostDetail';
import { CommunityScreen } from '@/screens/Community';
import { UserProfileScreen } from '@/screens/UserProfile';
import { SearchScreen } from '@/screens/Search';
import { SettingsScreen } from '@/screens/Settings';
import { EditProfileScreen } from '@/screens/EditProfile';
import { ModerationScreen } from '@/screens/Moderation';
import { ModQueueScreen } from '@/screens/ModQueue';
import { AdminSettingsScreen } from '@/screens/AdminSettings';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: theme.colors.primary,
    background: theme.colors.background,
    card: theme.colors.card,
    text: theme.colors.text,
    border: theme.colors.border,
    notification: theme.colors.primary,
  },
};

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.card },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        {!user ? (
          <Stack.Screen 
            name="Auth" 
            component={AuthScreen} 
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen 
              name="Main" 
              component={TabNavigator} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="PostDetail" 
              component={PostDetailScreen}
              options={{ title: 'Post' }}
            />
            <Stack.Screen 
              name="Community" 
              component={CommunityScreen}
              options={({ route }) => ({ title: `r/${route.params.communityName}` })}
            />
            <Stack.Screen 
              name="UserProfile" 
              component={UserProfileScreen}
              options={{ title: 'Profile' }}
            />
            <Stack.Screen 
              name="Search" 
              component={SearchScreen}
              options={{ title: 'Search' }}
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
            <Stack.Screen 
              name="EditProfile" 
              component={EditProfileScreen}
              options={{ title: 'Edit Profile' }}
            />
            <Stack.Screen 
              name="Moderation" 
              component={ModerationScreen}
              options={{ title: 'Moderation' }}
            />
            <Stack.Screen 
              name="ModQueue" 
              component={ModQueueScreen}
              options={{ title: 'Mod Queue' }}
            />
            <Stack.Screen 
              name="AdminSettings" 
              component={AdminSettingsScreen}
              options={{ title: 'Admin Settings' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
