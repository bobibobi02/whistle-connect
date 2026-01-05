import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { router } from 'expo-router';

// Configure how notifications are handled when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationState {
  token: string | null;
  permission: 'granted' | 'denied' | 'undetermined';
}

export const usePushNotifications = () => {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const { user } = useAuth();
  
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Register for push notifications
  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        setPermission('denied');
        return null;
      }

      setPermission('granted');

      // Get the Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const pushToken = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      setToken(pushToken.data);

      // Android-specific channel configuration
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3b82f6',
        });
      }

      return pushToken.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }, []);

  // Store token in database
  const storePushToken = useCallback(async (pushToken: string) => {
    if (!user?.id) return;

    try {
      const platform = Platform.OS;
      
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert(
          {
            user_id: user.id,
            token: pushToken,
            platform,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,platform',
          }
        );

      if (error) {
        console.error('Error storing push token:', error);
      }
    } catch (error) {
      console.error('Error storing push token:', error);
    }
  }, [user?.id]);

  // Handle notification tap
  const handleNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    
    if (!data) return;

    const { type, postId, userId, communityName } = data as {
      type?: string;
      postId?: string;
      userId?: string;
      communityName?: string;
    };

    switch (type) {
      case 'comment':
      case 'upvote':
      case 'mention':
        if (postId) {
          router.push(`/post/${postId}`);
        }
        break;
      case 'follow':
        // Navigate to profile
        router.push('/(tabs)/profile');
        break;
      default:
        // Default to feed
        router.push('/(tabs)');
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    // Get initial permission status
    Notifications.getPermissionsAsync().then(({ status }) => {
      setPermission(status);
    });

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [handleNotificationResponse]);

  // Register and store token when user logs in
  useEffect(() => {
    if (user?.id) {
      registerForPushNotifications().then((pushToken) => {
        if (pushToken) {
          storePushToken(pushToken);
        }
      });
    }
  }, [user?.id, registerForPushNotifications, storePushToken]);

  // Request permission manually
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const pushToken = await registerForPushNotifications();
    
    if (pushToken) {
      await storePushToken(pushToken);
      return true;
    }
    
    return false;
  }, [registerForPushNotifications, storePushToken]);

  // Schedule a local notification (for testing)
  const scheduleLocalNotification = useCallback(async (
    title: string,
    body: string,
    data?: Record<string, unknown>
  ) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null, // Immediately
    });
  }, []);

  // Get badge count
  const getBadgeCount = useCallback(async (): Promise<number> => {
    return Notifications.getBadgeCountAsync();
  }, []);

  // Set badge count
  const setBadgeCount = useCallback(async (count: number): Promise<boolean> => {
    return Notifications.setBadgeCountAsync(count);
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  }, []);

  return {
    token,
    permission,
    requestPermission,
    scheduleLocalNotification,
    getBadgeCount,
    setBadgeCount,
    clearAllNotifications,
    isSupported: Device.isDevice,
  };
};
