'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { BILLING_UPDATED_EVENT, FLASH_NOTICE_KEY } from '@/lib/client/useInstantProUpgrade';
import { useUserStore } from '@/lib/store/userStore';

interface BillingPayload {
  plan?: 'free' | 'pro';
  expiresAt?: string | null;
  entitlement?: {
    tier?: 'free' | 'pro';
    status?: string;
    source?: string;
    updatedAt?: string | null;
    expiresAt?: string | null;
  };
}

function resolveTier(payload: BillingPayload | null): 'free' | 'pro' {
  if (payload?.plan === 'pro') return 'pro';
  if (payload?.entitlement?.tier === 'pro') return 'pro';
  return 'free';
}

export function BillingReturnHandler() {
  const setPro = useUserStore((state) => state.setPro);
  const lastHandledRef = useRef('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const billingFlag = String(url.searchParams.get('billing') || '').trim().toLowerCase();
    if (!billingFlag) return;

    const key = `${url.pathname}?${url.searchParams.toString()}`;
    if (lastHandledRef.current === key) return;
    lastHandledRef.current = key;

    const clearBillingParam = () => {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete('billing');
      window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    };

    const syncEntitlement = async () => {
      try {
        const response = await fetch('/api/billing', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });
        const payload = (await response.json().catch(() => null)) as BillingPayload | null;
        if (!response.ok || !payload) return;

        const tier = resolveTier(payload);
        setPro(tier === 'pro');

        if (payload.entitlement) {
          window.dispatchEvent(
            new CustomEvent(BILLING_UPDATED_EVENT, {
              detail: payload.entitlement,
            }),
          );
        }
      } catch {
        // Silent fallback: toast is shown regardless, entitlement can refresh on next poll.
      }
    };

    if (billingFlag === 'success') {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(FLASH_NOTICE_KEY, 'Ödeme başarılı! Pro planın aktif edildi.');
      }
      toast.success('Ödeme başarılı! Planın güncelleniyor.');
      void syncEntitlement();
      clearBillingParam();
      return;
    }

    if (billingFlag === 'cancel') {
      toast('Ödeme iptal edildi.');
      clearBillingParam();
      return;
    }

    toast.error('Ödeme dönüşü doğrulanamadı.');
    clearBillingParam();
  }, [setPro]);

  return null;
}
