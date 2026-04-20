'use client';

import type { PersistStorage } from 'zustand/middleware';

/**
 * Capacitor-aware storage adapter for Zustand persist middleware.
 * Falls back to localStorage on web.
 */
export function createPersistStorage<T>(): PersistStorage<T> {
  return {
    getItem: async (name: string) => {
      try {
        const { isNative } = await import('@/lib/native/platform');
        if (isNative()) {
          const { Preferences } = await import('@capacitor/preferences');
          const { value } = await Preferences.get({ key: name });
          if (!value) return null;
          return JSON.parse(value) as { state: T; version?: number };
        }
      } catch {
        // fall through to localStorage
      }

      try {
        const raw = localStorage.getItem(name);
        if (!raw) return null;
        return JSON.parse(raw) as { state: T; version?: number };
      } catch {
        return null;
      }
    },

    setItem: async (name: string, value: { state: T; version?: number }) => {
      const serialized = JSON.stringify(value);
      try {
        const { isNative } = await import('@/lib/native/platform');
        if (isNative()) {
          const { Preferences } = await import('@capacitor/preferences');
          await Preferences.set({ key: name, value: serialized });
          return;
        }
      } catch {
        // fall through to localStorage
      }

      try {
        localStorage.setItem(name, serialized);
      } catch {
        // quota exceeded or unavailable
      }
    },

    removeItem: async (name: string) => {
      try {
        const { isNative } = await import('@/lib/native/platform');
        if (isNative()) {
          const { Preferences } = await import('@capacitor/preferences');
          await Preferences.remove({ key: name });
          return;
        }
      } catch {
        // fall through
      }

      try {
        localStorage.removeItem(name);
      } catch {
        // ignore
      }
    },
  };
}
