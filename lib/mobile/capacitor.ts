'use client';

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Network } from '@capacitor/network';
import { PushNotifications } from '@capacitor/push-notifications';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

export type NativeNetworkStatus = {
  connected: boolean;
  connectionType?: string;
};

export function isNativeShell(): boolean {
  return Capacitor.isNativePlatform();
}

export async function configureNativeChrome(): Promise<void> {
  if (!isNativeShell()) return;

  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#09080A' });
  } catch {}
}

export async function hideNativeSplash(delayMs = 180): Promise<void> {
  if (!isNativeShell()) return;

  window.setTimeout(() => {
    void SplashScreen.hide().catch(() => undefined);
  }, delayMs);
}

export async function initializePushNotifications(): Promise<void> {
  if (!isNativeShell()) return;

  try {
    let permissions = await PushNotifications.checkPermissions();

    if (permissions.receive === 'prompt') {
      permissions = await PushNotifications.requestPermissions();
    }

    if (permissions.receive !== 'granted') return;

    PushNotifications.addListener('registration', (token) => {
      window.localStorage.setItem('kd_push_token', token.value);
    });

    PushNotifications.addListener('registrationError', () => undefined);
    await PushNotifications.register();
  } catch {}
}

export async function impactHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> {
  if (!isNativeShell()) return;

  const mappedStyle =
    style === 'heavy' ? ImpactStyle.Heavy : style === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light;

  try {
    await Haptics.impact({ style: mappedStyle });
  } catch {}
}

export async function pickNativeAnalysisPhoto(): Promise<string | null> {
  if (!isNativeShell()) return null;

  try {
    const photo = await Camera.getPhoto({
      quality: 92,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      promptLabelHeader: 'Fotoğraf seç',
      promptLabelPhoto: 'Fotoğraf çek',
      promptLabelPicture: 'Galeriden seç',
      promptLabelCancel: 'İptal',
    });

    return photo.dataUrl ?? null;
  } catch {
    return null;
  }
}

export async function getNativeNetworkStatus(): Promise<NativeNetworkStatus> {
  if (isNativeShell()) {
    const status = await Network.getStatus();
    return {
      connected: status.connected,
      connectionType: status.connectionType,
    };
  }

  return {
    connected: typeof navigator === 'undefined' ? true : navigator.onLine,
    connectionType: 'web',
  };
}

export async function onNativeNetworkStatusChange(
  callback: (status: NativeNetworkStatus) => void,
): Promise<() => void> {
  if (isNativeShell()) {
    const listener = await Network.addListener('networkStatusChange', (status) => {
      callback({
        connected: status.connected,
        connectionType: status.connectionType,
      });
    });

    return () => {
      void listener.remove();
    };
  }

  const handleOnline = () => callback({ connected: true, connectionType: 'web' });
  const handleOffline = () => callback({ connected: false, connectionType: 'web' });

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

export async function wireNativeBackButton(onCanGoBack: () => boolean, goBack: () => void): Promise<() => void> {
  if (!isNativeShell()) return () => undefined;

  const listener = await App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack || onCanGoBack()) {
      goBack();
      return;
    }

    void App.minimizeApp().catch(() => undefined);
  });

  return () => {
    void listener.remove();
  };
}
