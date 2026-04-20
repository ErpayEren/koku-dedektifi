'use client';

import { isNative } from './platform';

type ImpactStyleKey = 'Heavy' | 'Medium' | 'Light';
type NotificationTypeKey = 'Success' | 'Warning' | 'Error';

async function getHapticsPlugin() {
  const { Haptics, ImpactStyle: IS, NotificationType: NT } = await import('@capacitor/haptics');
  return { Haptics, ImpactStyle: IS, NotificationType: NT };
}

export const haptics = {
  async impact(style: ImpactStyleKey = 'Medium'): Promise<void> {
    if (!isNative()) return;
    try {
      const { Haptics, ImpactStyle } = await getHapticsPlugin();
      await Haptics.impact({ style: ImpactStyle[style] });
    } catch {
      // haptics not available
    }
  },

  async notification(type: NotificationTypeKey = 'Success'): Promise<void> {
    if (!isNative()) return;
    try {
      const { Haptics, NotificationType } = await getHapticsPlugin();
      await Haptics.notification({ type: NotificationType[type] });
    } catch {
      // haptics not available
    }
  },

  async vibrate(duration = 300): Promise<void> {
    if (!isNative()) return;
    try {
      const { Haptics } = await getHapticsPlugin();
      await Haptics.vibrate({ duration });
    } catch {
      // haptics not available
    }
  },
};
