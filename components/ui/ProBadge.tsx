'use client';

import { useInstantProUpgrade } from '@/lib/client/useInstantProUpgrade';

export function ProBadge() {
  const { activate, busy } = useInstantProUpgrade();

  return (
    <button
      type="button"
      onClick={() => void activate()}
      disabled={busy}
      className="text-[9px] font-mono tracking-[.12em] uppercase
                 px-2.5 py-1 border border-[var(--gold-line)] rounded-[6px]
                 text-gold bg-[var(--gold-dim)] hover:bg-gold/20
                 transition-colors disabled:opacity-60"
    >
      {busy ? '...' : 'Pro'}
    </button>
  );
}
