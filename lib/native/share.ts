'use client';

import { isNative } from './platform';

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

export async function nativeShare(options: ShareOptions): Promise<boolean> {
  if (isNative()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: options.title,
        text: options.text,
        url: options.url,
        dialogTitle: options.dialogTitle,
      });
      return true;
    } catch {
      return false;
    }
  }

  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url,
      });
      return true;
    } catch {
      return false;
    }
  }

  if (options.url) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = globalThis.navigator as any;
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(options.url);
        return true;
      }
    } catch {
      // clipboard unavailable
    }
  }

  return false;
}
