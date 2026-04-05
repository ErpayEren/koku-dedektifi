'use client';

import { useEffect } from 'react';
import { CLIENT_DATA_CHANGED_EVENT, getHistory, getWardrobe } from '@/lib/client/storage';
import { useBillingEntitlement } from '@/lib/client/useBillingEntitlement';
import { useUserStore } from '@/lib/store/userStore';

function getTodayUsage(): number {
  const today = new Date().toISOString().slice(0, 10);
  return getHistory().filter((row) => String(row.createdAt || '').slice(0, 10) === today).length;
}

function syncClientCounts(): void {
  useUserStore.getState().hydrate({
    dailyUsed: getTodayUsage(),
    wardrobeCount: getWardrobe().length,
    lastDailyKey: new Date().toISOString().slice(0, 10),
  });
}

export function UserStoreHydrator() {
  const entitlement = useBillingEntitlement();

  useEffect(() => {
    useUserStore.getState().hydrate({
      isPro: entitlement.tier === 'pro',
      dailyUsed: getTodayUsage(),
      wardrobeCount: getWardrobe().length,
      lastDailyKey: new Date().toISOString().slice(0, 10),
    });
  }, [entitlement.tier]);

  useEffect(() => {
    syncClientCounts();

    const handleClientDataChanged = () => syncClientCounts();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncClientCounts();
    };
    const handleFocus = () => syncClientCounts();

    window.addEventListener(CLIENT_DATA_CHANGED_EVENT, handleClientDataChanged as EventListener);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener(CLIENT_DATA_CHANGED_EVENT, handleClientDataChanged as EventListener);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return null;
}
