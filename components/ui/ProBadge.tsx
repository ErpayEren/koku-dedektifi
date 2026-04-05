'use client';

import { useInstantProUpgrade } from '@/lib/client/useInstantProUpgrade';
import { useUserStore } from '@/lib/store/userStore';

export function ProBadge() {
  const { activate, busy } = useInstantProUpgrade();
  const isPro = useUserStore((state) => state.isPro);

  return (
    <button
      type="button"
      onClick={() => {
        if (!isPro) void activate();
      }}
      disabled={busy || isPro}
      className={`rounded-[6px] border px-2.5 py-1 text-[9px] font-mono uppercase tracking-[.12em] transition-colors disabled:opacity-60 ${
        isPro
          ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-300'
          : 'border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold hover:bg-gold/20'
      }`}
    >
      {busy ? '...' : isPro ? 'Pro ✓' : 'Pro'}
    </button>
  );
}
