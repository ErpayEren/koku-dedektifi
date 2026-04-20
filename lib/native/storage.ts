'use client';

import { isNative } from './platform';

type StorageValue = string | null;

async function nativeSet(key: string, value: string): Promise<void> {
  const { Preferences } = await import('@capacitor/preferences');
  await Preferences.set({ key, value });
}

async function nativeGet(key: string): Promise<StorageValue> {
  const { Preferences } = await import('@capacitor/preferences');
  const result = await Preferences.get({ key });
  return result.value;
}

async function nativeRemove(key: string): Promise<void> {
  const { Preferences } = await import('@capacitor/preferences');
  await Preferences.remove({ key });
}

export const nativeStorage = {
  async set(key: string, value: string): Promise<void> {
    if (isNative()) {
      await nativeSet(key, value);
    } else {
      try {
        localStorage.setItem(key, value);
      } catch {
        // storage unavailable (private mode, quota exceeded)
      }
    }
  },

  async get(key: string): Promise<StorageValue> {
    if (isNative()) {
      return nativeGet(key);
    }
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async remove(key: string): Promise<void> {
    if (isNative()) {
      await nativeRemove(key);
    } else {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
  },
};

export function createCapacitorStorageAdapter() {
  return {
    getItem: async (key: string): Promise<string | null> => {
      return nativeStorage.get(key);
    },
    setItem: async (key: string, value: string): Promise<void> => {
      await nativeStorage.set(key, value);
    },
    removeItem: async (key: string): Promise<void> => {
      await nativeStorage.remove(key);
    },
  };
}
