import * as Sharing from 'expo-sharing';
import { Alert, Platform, Share } from 'react-native';

const BASE_URL = 'https://whistle.app'; // Replace with actual app URL

export const useShare = () => {
  const sharePost = async (postId: string, title: string) => {
    const url = `${BASE_URL}/post/${postId}`;
    const message = `${title}\n\n${url}`;

    try {
      // Check if sharing is available (native share)
      if (await Sharing.isAvailableAsync()) {
        // For native share sheet, we use React Native's Share API
        // as expo-sharing is primarily for file sharing
      }

      // Use React Native Share API for URL/text sharing
      if (Platform.OS === 'ios') {
        await Share.share({
          message: title,
          url,
        });
      } else {
        await Share.share({
          message,
        });
      }
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        Alert.alert('Error', 'Unable to share this post');
      }
    }
  };

  const shareCommunity = async (communityName: string, displayName: string) => {
    const url = `${BASE_URL}/community/${communityName}`;
    const message = `Check out w/${communityName} on Whistle!\n\n${url}`;

    try {
      if (Platform.OS === 'ios') {
        await Share.share({
          message: `Check out w/${communityName} on Whistle!`,
          url,
        });
      } else {
        await Share.share({
          message,
        });
      }
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        Alert.alert('Error', 'Unable to share this community');
      }
    }
  };

  const shareUserProfile = async (userId: string, username: string) => {
    const url = `${BASE_URL}/user/${userId}`;
    const message = `Check out u/${username} on Whistle!\n\n${url}`;

    try {
      if (Platform.OS === 'ios') {
        await Share.share({
          message: `Check out u/${username} on Whistle!`,
          url,
        });
      } else {
        await Share.share({
          message,
        });
      }
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        Alert.alert('Error', 'Unable to share this profile');
      }
    }
  };

  return { sharePost, shareCommunity, shareUserProfile };
};
