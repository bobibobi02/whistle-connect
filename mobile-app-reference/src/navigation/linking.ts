import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { RootStackParamList } from './types';

// Create the deep link prefix
const prefix = Linking.createURL('/');

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    prefix,
    'lovable://',
    'https://lovable.app',
    'https://*.lovable.app',
  ],
  
  config: {
    screens: {
      Auth: 'auth',
      Main: {
        screens: {
          Home: 'home',
          Communities: 'communities',
          CreatePost: 'create',
          Notifications: 'notifications',
          Profile: 'profile',
        },
      },
      PostDetail: {
        path: 'post/:postId',
        parse: {
          postId: (postId: string) => postId,
        },
      },
      Community: {
        path: 'community/:communityName',
        parse: {
          communityName: (communityName: string) => communityName,
        },
      },
      UserProfile: {
        path: 'user/:userId',
        parse: {
          userId: (userId: string) => userId,
        },
      },
      Search: {
        path: 'search',
        parse: {
          query: (query: string) => query,
        },
      },
      Settings: 'settings',
      EditProfile: 'edit-profile',
      Moderation: {
        path: 'moderation/:communityId',
        parse: {
          communityId: (communityId: string) => communityId,
        },
      },
      ModQueue: 'mod-queue',
      AdminSettings: 'admin',
    },
  },

  // Handle notification deep links
  async getInitialURL() {
    // Check if app was opened via a deep link
    const url = await Linking.getInitialURL();
    if (url != null) {
      return url;
    }

    // Check if app was opened via a notification
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response?.notification.request.content.data) {
      const data = response.notification.request.content.data;
      return getUrlFromNotificationData(data);
    }

    return null;
  },

  // Subscribe to incoming links
  subscribe(listener) {
    // Listen for URL changes
    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
      listener(url);
    });

    // Listen for notification interactions
    const notificationSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        const url = getUrlFromNotificationData(data);
        if (url) {
          listener(url);
        }
      }
    );

    return () => {
      urlSubscription.remove();
      notificationSubscription.remove();
    };
  },
};

// Convert notification data to a deep link URL
function getUrlFromNotificationData(data: Record<string, unknown>): string | null {
  if (!data) return null;

  const type = data.type as string;
  const postId = data.postId as string;
  const userId = data.userId as string;
  const communityName = data.communityName as string;
  const commentId = data.commentId as string;

  switch (type) {
    case 'comment':
    case 'reply':
    case 'mention':
    case 'upvote':
      if (postId) {
        const url = `lovable://post/${postId}`;
        return commentId ? `${url}?comment=${commentId}` : url;
      }
      break;

    case 'follow':
      if (userId) {
        return `lovable://user/${userId}`;
      }
      break;

    case 'community':
      if (communityName) {
        return `lovable://community/${communityName}`;
      }
      break;
  }

  return null;
}
