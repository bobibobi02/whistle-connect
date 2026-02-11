import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from "@capacitor/push-notifications";

type NotificationPermissionState = "default" | "granted" | "denied";

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermissionState>("default");
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const { user } = useAuth();

  // Initialize based on platform
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      initNativePushNotifications();
    } else if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Initialize native push notifications (iOS/Android)
  const initNativePushNotifications = async () => {
    try {
      // Check current permission status
      const permStatus = await PushNotifications.checkPermissions();
      setPermission(permStatus.receive === "granted" ? "granted" : "default");

      // Register listeners
      PushNotifications.addListener("registration", async (token: Token) => {
        console.log("Push registration success, token:", token.value);
        setFcmToken(token.value);
        
        // Store token in database
        if (user?.id) {
          await storePushToken(token.value, Capacitor.getPlatform());
        }
      });

      PushNotifications.addListener("registrationError", (error) => {
        console.error("Push registration error:", error);
      });

      PushNotifications.addListener("pushNotificationReceived", (notification: PushNotificationSchema) => {
        console.log("Push notification received:", notification);
      });

      PushNotifications.addListener("pushNotificationActionPerformed", (notification: ActionPerformed) => {
        console.log("Push notification action performed:", notification);
        // Handle notification tap - navigate to relevant screen
        handleNotificationTap(notification.notification?.data);
      });
    } catch (error) {
      console.error("Error initializing native push notifications:", error);
    }
  };

  // Request permission for push notifications
  const requestPermission = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const permStatus = await PushNotifications.requestPermissions();
        const granted = permStatus.receive === "granted";
        setPermission(granted ? "granted" : "denied");
        
        if (granted) {
          await PushNotifications.register();
        }
        return granted;
      } catch (error) {
        console.error("Error requesting native push permission:", error);
        return false;
      }
    } else {
      // Web push notifications
      if (!("Notification" in window)) {
        console.log("This browser does not support notifications");
        return false;
      }

      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === "granted") {
        await registerWebPush();
      }
      
      return result === "granted";
    }
  }, [user?.id]);

  // Register for web push notifications
  const registerWebPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key from environment or config
      const vapidPublicKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      
      if (!vapidPublicKey) {
        console.warn("VAPID public key not configured");
        return;
      }

      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      const token = JSON.stringify(subscription);
      setFcmToken(token);
      
      if (user?.id) {
        await storePushToken(token, "web");
      }
    } catch (error) {
      console.error("Error registering web push:", error);
    }
  };

  // Store push token in database
  const storePushToken = async (token: string, platform: string) => {
    try {
      const { error } = await supabase
        .from("user_push_tokens")
        .upsert(
          {
            user_id: user!.id,
            token,
            platform,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,platform",
          }
        );

      if (error) {
        console.error("Error storing push token:", error);
      }
    } catch (error) {
      console.error("Error storing push token:", error);
    }
  };

  // Handle notification tap
  const handleNotificationTap = (data: any) => {
    if (!data) return;

    const { type, postId, userId, communityName } = data;

    switch (type) {
      case "comment":
      case "upvote":
      case "mention":
        if (postId) {
          window.location.href = `/post/${postId}`;
        }
        break;
      case "follow":
        if (userId) {
          window.location.href = `/profile/${userId}`;
        }
        break;
      case "community":
        if (communityName) {
          window.location.href = `/c/${communityName}`;
        }
        break;
      default:
        window.location.href = "/notifications";
    }
  };

  // Show web notification (when app is in foreground on web)
  const showNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (permission !== "granted") return;

      // Don't show if the page is focused (on web)
      if (!Capacitor.isNativePlatform() && document.hasFocus()) return;

      const notification = new Notification(title, {
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    },
    [permission]
  );

  // Store token when user logs in
  useEffect(() => {
    if (user?.id && fcmToken) {
      const platform = Capacitor.isNativePlatform() 
        ? Capacitor.getPlatform() 
        : "web";
      storePushToken(fcmToken, platform);
    }
  }, [user?.id, fcmToken]);

  return {
    permission,
    fcmToken,
    requestPermission,
    showNotification,
    isSupported: Capacitor.isNativePlatform() || "Notification" in window,
    isNative: Capacitor.isNativePlatform(),
  };
};
