'use client';

import { Capacitor } from '@capacitor/core';

export const isNative = (): boolean => Capacitor.isNativePlatform();
export const isAndroid = (): boolean => Capacitor.getPlatform() === 'android';
export const isIOS = (): boolean => Capacitor.getPlatform() === 'ios';
export const isWeb = (): boolean => Capacitor.getPlatform() === 'web';
