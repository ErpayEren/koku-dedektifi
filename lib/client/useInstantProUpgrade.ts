'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

export const BILLING_UPDATED_EVENT = 'kd:billing-entitlement-updated';

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
        router.push('/hesap');
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
      router.refresh();
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Pro aktivasyonu başlatılamadı.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [busy, router]);

  return {
    activate,
    busy,
    error,
    clearError: () => setError(''),
  };
}
