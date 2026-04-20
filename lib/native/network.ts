'use client';

import { isNative } from './platform';

export async function isOnline(): Promise<boolean> {
  if (isNative()) {
    try {
      const { Network } = await import('@capacitor/network');
      const status = await Network.getStatus();
      return status.connected;
    } catch {
      return typeof navigator !== 'undefined' ? navigator.onLine : true;
    }
  }
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export async function onNetworkChange(
  callback: (connected: boolean) => void,
): Promise<(() => void) | null> {
  if (isNative()) {
    try {
      const { Network } = await import('@capacitor/network');
      const handle = await Network.addListener('networkStatusChange', (status) => {
        callback(status.connected);
      });
      return () => handle.remove();
    } catch {
      return null;
    }
  }

  if (typeof window !== 'undefined') {
    const onOnline = () => callback(true);
    const onOffline = () => callback(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }

  return null;
}
