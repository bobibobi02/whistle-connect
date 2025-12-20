import { useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { useUnreadCount } from "@/hooks/useNotifications";

// Badge plugin for native - needs to be dynamically imported
const setBadgeNative = async (count: number) => {
  try {
    // For iOS, the badge is set via the push notification payload
    // For Android, we use a local notification badge update
    const { Badge } = await import("@capawesome/capacitor-badge");
    if (count > 0) {
      await Badge.set({ count });
    } else {
      await Badge.clear();
    }
  } catch (error) {
    // Badge plugin not available, fall back silently
    console.log("Native badge not available:", error);
  }
};

export const useBadgeCount = () => {
  const { data: unreadCount = 0 } = useUnreadCount();

  const setBadgeCount = useCallback(async (count: number) => {
    try {
      if (Capacitor.isNativePlatform()) {
        await setBadgeNative(count);
      } else if ("setAppBadge" in navigator) {
        // Web badge API (Chrome, Edge on supported platforms)
        if (count > 0) {
          await (navigator as any).setAppBadge(count);
        } else {
          await (navigator as any).clearAppBadge();
        }
      }
    } catch (error) {
      console.log("Badge count not supported:", error);
    }
  }, []);

  const clearBadge = useCallback(async () => {
    await setBadgeCount(0);
  }, [setBadgeCount]);

  // Automatically update badge when unread count changes
  useEffect(() => {
    setBadgeCount(unreadCount);
  }, [unreadCount, setBadgeCount]);

  return {
    unreadCount,
    setBadgeCount,
    clearBadge,
  };
};

