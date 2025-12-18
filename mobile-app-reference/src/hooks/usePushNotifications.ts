import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/config/supabase';
import { useAuth } from './useAuth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const usePushNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const { user } = useAuth();

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);
        // Store token in database when user is logged in
        if (user) {
          storePushToken(user.id, token);
        }
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      // Handle notification tap - navigate to relevant screen
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
  }, [user]);

  return {
    expoPushToken,
    notification,
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
  // Note: You'll need to create a user_push_tokens table in your database
  // This is a minimal addition to support push notifications
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
  } catch (error) {
    console.error('Error storing push token:', error);
  }
}

function handleNotificationTap(data: any) {
  // This will be called when user taps on a notification
  // You can use navigation to go to the relevant screen
  // Example: navigation.navigate('PostDetail', { postId: data.postId });
  console.log('Notification tapped:', data);
}
