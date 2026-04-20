'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createPersistStorage } from '@/lib/native/zustand-storage';

const FREE_DAILY_LIMIT = 3;
const FREE_WARDROBE_LIMIT = 5;

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function resolveDailyLimit(isPro: boolean): number {
  return isPro ? Number.POSITIVE_INFINITY : FREE_DAILY_LIMIT;
}

function resolveWardrobeLimit(isPro: boolean): number {
  return isPro ? Number.POSITIVE_INFINITY : FREE_WARDROBE_LIMIT;
}

function normalizeDailyUsed(dailyUsed: number, lastDailyKey: string): number {
  return lastDailyKey === getTodayKey() ? dailyUsed : 0;
}

export interface UserStore {
  isPro: boolean;
  dailyUsed: number;
  dailyLimit: number;
  wardrobeCount: number;
  wardrobeLimit: number;
  lastDailyKey: string;
  setPro: (val: boolean) => void;
  incrementUsage: () => void;
  resetDaily: () => void;
  setWardrobeCount: (count: number) => void;
  setDailyUsed: (count: number) => void;
  hydrate: (fromDB: Partial<UserStore>) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      isPro: false,
      dailyUsed: 0,
      dailyLimit: FREE_DAILY_LIMIT,
      wardrobeCount: 0,
      wardrobeLimit: FREE_WARDROBE_LIMIT,
      lastDailyKey: getTodayKey(),
      setPro: (val) =>
        set((state) => ({
          ...state,
          isPro: val,
          dailyLimit: resolveDailyLimit(val),
          wardrobeLimit: resolveWardrobeLimit(val),
        })),
      incrementUsage: () =>
        set((state) => {
          const nextDailyKey = getTodayKey();
          const currentUsed = normalizeDailyUsed(state.dailyUsed, state.lastDailyKey);
          return {
            ...state,
            lastDailyKey: nextDailyKey,
            dailyUsed: currentUsed + 1,
          };
        }),
      resetDaily: () =>
        set((state) => ({
          ...state,
          dailyUsed: 0,
          lastDailyKey: getTodayKey(),
        })),
      setWardrobeCount: (count) =>
        set((state) => ({
          ...state,
          wardrobeCount: Math.max(0, Number.isFinite(count) ? count : 0),
        })),
      setDailyUsed: (count) =>
        set((state) => ({
          ...state,
          dailyUsed: Math.max(0, Number.isFinite(count) ? count : 0),
          lastDailyKey: getTodayKey(),
        })),
      hydrate: (fromDB) =>
        set((state) => {
          const nextIsPro = fromDB.isPro ?? state.isPro;
          const nextDailyKey = fromDB.lastDailyKey || state.lastDailyKey || getTodayKey();
          const rawDailyUsed = typeof fromDB.dailyUsed === 'number' ? fromDB.dailyUsed : state.dailyUsed;
          const nextDailyUsed = normalizeDailyUsed(Math.max(0, rawDailyUsed), nextDailyKey);
          const nextWardrobeCount =
            typeof fromDB.wardrobeCount === 'number' ? Math.max(0, fromDB.wardrobeCount) : state.wardrobeCount;

          return {
            ...state,
            isPro: nextIsPro,
            dailyUsed: nextDailyUsed,
            dailyLimit: resolveDailyLimit(nextIsPro),
            wardrobeCount: nextWardrobeCount,
            wardrobeLimit: resolveWardrobeLimit(nextIsPro),
            lastDailyKey: nextDailyKey === getTodayKey() ? nextDailyKey : getTodayKey(),
          };
        }),
    }),
    {
      name: 'kd:user-store:v1',
      storage: createPersistStorage<Partial<UserStore>>(),
      partialize: (state) => ({
        isPro: state.isPro,
        dailyUsed: normalizeDailyUsed(state.dailyUsed, state.lastDailyKey),
        wardrobeCount: state.wardrobeCount,
        lastDailyKey: state.lastDailyKey,
      }),
      merge: (persistedState, currentState) => {
        const merged = {
          ...currentState,
          ...(persistedState as Partial<UserStore>),
        };
        const nextIsPro = Boolean(merged.isPro);
        const nextDailyKey = merged.lastDailyKey || getTodayKey();
        return {
          ...merged,
          dailyUsed: normalizeDailyUsed(Math.max(0, merged.dailyUsed ?? 0), nextDailyKey),
          dailyLimit: resolveDailyLimit(nextIsPro),
          wardrobeLimit: resolveWardrobeLimit(nextIsPro),
          lastDailyKey: nextDailyKey === getTodayKey() ? nextDailyKey : getTodayKey(),
        };
      },
    },
  ),
);
