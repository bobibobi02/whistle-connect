import { useState, useEffect, useRef, useCallback } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '@/config/supabase';
import { useAuth } from './useAuth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export type NotificationData = {
  type: 'comment' | 'upvote' | 'follow' | 'reply' | 'mention';
  postId?: string;
  commentId?: string;
  userId?: string;
  communityName?: string;
};

export const usePushNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const { user } = useAuth();
  const navigation = useNavigation();

  const handleNotificationTap = useCallback((data: NotificationData) => {
    console.log('Handling notification tap:', data);

    if (!data || !data.type) {
      console.log('No data or type in notification');
      return;
    }

    switch (data.type) {
      case 'comment':
      case 'reply':
      case 'mention':
        // Navigate to post detail, optionally scroll to comment
        if (data.postId) {
          navigation.navigate('PostDetail', { 
            postId: data.postId,
            // Pass commentId as a param to highlight/scroll to comment
            ...(data.commentId && { highlightCommentId: data.commentId })
          });
        }
        break;

      case 'upvote':
        // Navigate to the post that was upvoted
        if (data.postId) {
          navigation.navigate('PostDetail', { postId: data.postId });
        }
        break;

      case 'follow':
        // Navigate to the follower's profile
        if (data.userId) {
          navigation.navigate('UserProfile', { userId: data.userId });
        }
        break;

      default:
        console.log('Unknown notification type:', data.type);
    }
  }, [navigation]);

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);
        if (user) {
          storePushToken(user.id, token);
        }
      }
    });

    // Handle notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    // Handle notification taps (when user interacts with notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as NotificationData;
      handleNotificationTap(data);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user, handleNotificationTap]);

  // Check for initial notification (app opened via notification)
  useEffect(() => {
    const checkInitialNotification = async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response) {
        const data = response.notification.request.content.data as NotificationData;
        // Small delay to ensure navigation is ready
        setTimeout(() => {
          handleNotificationTap(data);
        }, 500);
      }
    };

    if (user) {
      checkInitialNotification();
    }
  }, [user, handleNotificationTap]);

  // Clear badge count when app becomes active
  useEffect(() => {
    const clearBadge = async () => {
      await Notifications.setBadgeCountAsync(0);
    };
    clearBadge();
  }, []);

  return {
    expoPushToken,
    notification,
    handleNotificationTap,
  };
};

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF5C7A',
    });

    // Create separate channels for different notification types
    await Notifications.setNotificationChannelAsync('comments', {
      name: 'Comments',
      description: 'Notifications for new comments on your posts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF5C7A',
    });

    await Notifications.setNotificationChannelAsync('upvotes', {
      name: 'Upvotes',
      description: 'Notifications when your content is upvoted',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100],
      lightColor: '#FF5C7A',
    });

    await Notifications.setNotificationChannelAsync('follows', {
      name: 'Follows',
      description: 'Notifications when someone follows you',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF5C7A',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'your-eas-project-id', // Replace with your EAS project ID
    })).data;
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

async function storePushToken(userId: string, token: string) {
  try {
    await supabase
      .from('user_push_tokens')
      .upsert({
        user_id: userId,
        token: token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,token',
      });
    console.log('Push token stored successfully');
  } catch (error) {
    console.error('Error storing push token:', error);
  }
}

// Utility to parse deep links
export function parseDeepLink(url: string): NotificationData | null {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);

    if (pathParts[0] === 'post' && pathParts[1]) {
      return {
        type: 'comment',
        postId: pathParts[1],
        commentId: parsed.searchParams.get('comment') || undefined,
      };
    }

    if (pathParts[0] === 'user' && pathParts[1]) {
      return {
        type: 'follow',
        userId: pathParts[1],
      };
    }

    if (pathParts[0] === 'community' && pathParts[1]) {
      return {
        type: 'comment',
        communityName: pathParts[1],
      };
    }

    return null;
  } catch (e) {
    console.error('Error parsing deep link:', e);
    return null;
  }
}
