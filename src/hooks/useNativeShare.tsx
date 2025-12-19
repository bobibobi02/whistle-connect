import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

export const useNativeShare = () => {
  const isAvailable = Capacitor.isNativePlatform() || 
    (typeof navigator !== 'undefined' && 'share' in navigator);

  const share = useCallback(async (options: ShareOptions): Promise<boolean> => {
    try {
      if (Capacitor.isNativePlatform()) {
        // Use Capacitor Share for native
        await Share.share({
          title: options.title,
          text: options.text,
          url: options.url,
          dialogTitle: options.dialogTitle || 'Share',
        });
        return true;
      } else if (typeof navigator !== 'undefined' && 'share' in navigator) {
        // Use Web Share API for PWA/browsers that support it
        await navigator.share({
          title: options.title,
          text: options.text,
          url: options.url,
        });
        return true;
      }
      return false;
    } catch (error) {
      // User cancelled or share failed
      console.log('Share cancelled or failed:', error);
      return false;
    }
  }, []);

  const sharePost = useCallback(async (postId: string, title: string) => {
    const url = `${window.location.origin}/post/${postId}`;
    return share({
      title,
      text: `Check out this post on Whistle: ${title}`,
      url,
      dialogTitle: 'Share Post',
    });
  }, [share]);

  const shareCommunity = useCallback(async (communityName: string, displayName: string) => {
    const url = `${window.location.origin}/c/${communityName}`;
    return share({
      title: displayName,
      text: `Join the ${displayName} community on Whistle`,
      url,
      dialogTitle: 'Share Community',
    });
  }, [share]);

  const shareProfile = useCallback(async (username: string, displayName?: string) => {
    const url = `${window.location.origin}/u/${username}`;
    return share({
      title: displayName || username,
      text: `Check out ${displayName || username} on Whistle`,
      url,
      dialogTitle: 'Share Profile',
    });
  }, [share]);

  return {
    isAvailable,
    share,
    sharePost,
    shareCommunity,
    shareProfile,
  };
};
