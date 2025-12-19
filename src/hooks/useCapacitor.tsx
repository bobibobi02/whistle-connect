import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useNavigate } from 'react-router-dom';

export const useCapacitor = () => {
  const [isNative, setIsNative] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web'>('web');

  useEffect(() => {
    const native = Capacitor.isNativePlatform();
    setIsNative(native);
    setPlatform(Capacitor.getPlatform() as 'ios' | 'android' | 'web');

    if (native) {
      // Configure status bar for native
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      
      if (Capacitor.getPlatform() === 'android') {
        StatusBar.setBackgroundColor({ color: '#0a0908' }).catch(() => {});
      }
    }
  }, []);

  return { isNative, platform };
};

export const useDeepLinks = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleDeepLink = (event: URLOpenListenerEvent) => {
      const url = new URL(event.url);
      const path = url.pathname;
      
      // Handle whistle:// deep links
      // Examples:
      // whistle://post/123 -> /post/123
      // whistle://c/tech -> /c/tech
      // whistle://u/username -> /u/username
      
      if (path) {
        navigate(path);
      }
    };

    App.addListener('appUrlOpen', handleDeepLink);

    // Check if app was opened via deep link
    App.getLaunchUrl().then((result) => {
      if (result?.url) {
        handleDeepLink({ url: result.url });
      }
    });

    return () => {
      App.removeAllListeners();
    };
  }, [navigate]);
};

export const useBackButton = (customHandler?: () => boolean) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleBackButton = () => {
      // If custom handler returns true, it handled the back action
      if (customHandler && customHandler()) {
        return;
      }
      
      // Default: navigate back in history
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        // At root, minimize app (Android only)
        App.minimizeApp();
      }
    };

    App.addListener('backButton', handleBackButton);

    return () => {
      App.removeAllListeners();
    };
  }, [navigate, customHandler]);
};

export const useSafeArea = () => {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Use CSS env() variables for safe area
    const computedStyle = getComputedStyle(document.documentElement);
    
    const updateSafeArea = () => {
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10),
        bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10),
        left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10),
        right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10),
      });
    };

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);

    return () => {
      window.removeEventListener('resize', updateSafeArea);
    };
  }, []);

  return safeArea;
};
