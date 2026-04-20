'use client';

import { isNative, isAndroid } from './platform';

export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unavailable';

export async function checkCameraPermission(): Promise<PermissionStatus> {
  if (!isNative()) {
    if (typeof navigator?.permissions?.query === 'function') {
      try {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        return result.state as PermissionStatus;
      } catch {
        return 'prompt';
      }
    }
    return 'prompt';
  }

  try {
    const { Camera } = await import('@capacitor/camera');
    const perm = await Camera.checkPermissions();
    const state = perm.camera;
    if (state === 'granted') return 'granted';
    if (state === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'unavailable';
  }
}

export async function requestCameraPermission(): Promise<PermissionStatus> {
  if (!isNative()) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      return 'granted';
    } catch {
      return 'denied';
    }
  }

  try {
    const { Camera } = await import('@capacitor/camera');
    const result = await Camera.requestPermissions({ permissions: ['camera'] });
    const state = result.camera;
    if (state === 'granted') return 'granted';
    if (state === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'unavailable';
  }
}

export async function checkNotificationPermission(): Promise<PermissionStatus> {
  if (!isNative() || !isAndroid()) {
    if (typeof Notification !== 'undefined') {
      const state = Notification.permission;
      if (state === 'granted') return 'granted';
      if (state === 'denied') return 'denied';
      return 'prompt';
    }
    return 'unavailable';
  }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const perm = await PushNotifications.checkPermissions();
    const state = perm.receive;
    if (state === 'granted') return 'granted';
    if (state === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'unavailable';
  }
}

export async function requestNotificationPermission(): Promise<PermissionStatus> {
  if (!isNative() || !isAndroid()) {
    if (typeof Notification !== 'undefined') {
      const result = await Notification.requestPermission();
      return result as PermissionStatus;
    }
    return 'unavailable';
  }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const result = await PushNotifications.requestPermissions();
    const state = result.receive;
    if (state === 'granted') return 'granted';
    return 'denied';
  } catch {
    return 'unavailable';
  }
}
