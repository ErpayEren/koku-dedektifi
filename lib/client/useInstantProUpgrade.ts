'use client';

import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useUserStore } from '@/lib/store/userStore';

export const BILLING_UPDATED_EVENT = 'kd:billing-entitlement-updated';
export const FLASH_NOTICE_KEY = 'kd:flash-notice';

interface BillingEntitlementPayload {
  entitlement?: {
    tier?: 'free' | 'pro';
    status?: string;
    source?: string;
    updatedAt?: string | null;
  };
  error?: string;
}

export function useInstantProUpgrade() {
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const activate = useCallback(async (): Promise<boolean> => {
    if (busy) return false;
    setBusy(true);
    setError('');

    try {
      const response = await fetch('/api/billing', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'instant_upgrade',
          planId: 'pro',
        }),
      });

      const payload = (await response.json().catch(() => null)) as BillingEntitlementPayload | null;

      if (response.status === 401) {
        const redirectTarget = pathname && pathname !== '/hesap' ? `?redirect=${encodeURIComponent(pathname)}` : '';
        router.push(`/hesap${redirectTarget}` as Route);
        return false;
      }

      if (!response.ok || !payload?.entitlement) {
        throw new Error(payload?.error || 'Pro aktivasyonu başlatılamadı.');
      }

      window.dispatchEvent(
        new CustomEvent(BILLING_UPDATED_EVENT, {
          detail: payload.entitlement,
        }),
      );
      useUserStore.getState().setPro(true);

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(FLASH_NOTICE_KEY, 'Pro aktif! Tüm özellikler açıldı.');
      }

      router.refresh();
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Pro aktivasyonu başlatılamadı.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [busy, pathname, router]);

  return {
    activate,
    busy,
    error,
    clearError: () => setError(''),
  };
}
