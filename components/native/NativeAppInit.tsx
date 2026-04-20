'use client';

import { useEffect } from 'react';

export function NativeAppInit() {
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { isNative } = await import('@/lib/native/platform');
      if (!isNative() || cancelled) return;

      // Hide splash screen after app is ready
      const { hideSplashScreen } = await import('@/lib/native/splash');
      await hideSplashScreen();

      // Set status bar style
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0A0A0A' });
      } catch {
        // status bar plugin unavailable
      }

      // Register push notification token (infra only — no active use yet)
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const { checkNotificationPermission } = await import('@/lib/native/permissions');
        const status = await checkNotificationPermission();
        if (status === 'granted') {
          await PushNotifications.register();
        }
      } catch {
        // push notifications not available on this build
      }
    }

    void init();
    return () => { cancelled = true; };
  }, []);

  return null;
}
