'use client';

import { useEffect, useMemo, useState } from 'react';

export type BillingTier = 'free' | 'pro';

interface BillingEntitlementPayload {
  entitlement?: {
    tier?: BillingTier;
    status?: string;
  };
}

export interface BillingEntitlementSnapshot {
  tier: BillingTier;
  status: string;
  loaded: boolean;
  dailyAnalysisLimit: number;
  wardrobeLimit: number | null;
  similarLimit: number;
  moleculeUnlockedCount: number;
}

const DEFAULT_SNAPSHOT: BillingEntitlementSnapshot = {
  tier: 'free',
  status: 'unknown',
  loaded: false,
  dailyAnalysisLimit: 3,
  wardrobeLimit: 5,
  similarLimit: 3,
  moleculeUnlockedCount: 2,
};

export function buildEntitlementSnapshot(tier: BillingTier, status = 'active'): BillingEntitlementSnapshot {
  if (tier === 'pro') {
    return {
      tier,
      status,
      loaded: true,
      dailyAnalysisLimit: 9999,
      wardrobeLimit: null,
      similarLimit: 10,
      moleculeUnlockedCount: 999,
    };
  }

  return {
    tier: 'free',
    status,
    loaded: true,
    dailyAnalysisLimit: 3,
    wardrobeLimit: 5,
    similarLimit: 3,
    moleculeUnlockedCount: 2,
  };
}

export function useBillingEntitlement(): BillingEntitlementSnapshot {
  const [snapshot, setSnapshot] = useState<BillingEntitlementSnapshot>(DEFAULT_SNAPSHOT);

  useEffect(() => {
    let cancelled = false;

    async function hydratePlan(): Promise<void> {
      try {
        const response = await fetch('/api/billing', {
          method: 'GET',
          credentials: 'include',
        });
        const payload = (await response.json().catch(() => null)) as BillingEntitlementPayload | null;
        if (!response.ok || !payload) return;
        const tier = payload.entitlement?.tier === 'pro' ? 'pro' : 'free';
        const status = typeof payload.entitlement?.status === 'string' ? payload.entitlement.status : 'active';
        if (!cancelled) {
          setSnapshot(buildEntitlementSnapshot(tier, status));
        }
      } catch {
        if (!cancelled) {
          setSnapshot({
            ...DEFAULT_SNAPSHOT,
            loaded: true,
          });
        }
      }
    }

    void hydratePlan();

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => snapshot, [snapshot]);
}
