'use client';

import { useInstantProUpgrade } from '@/lib/client/useInstantProUpgrade';
import { useUserStore } from '@/lib/store/userStore';

export function ProBadge({ compact = false }: { compact?: boolean }) {
  const { activate, busy } = useInstantProUpgrade();
  const isPro = useUserStore((state) => state.isPro);

  return (
    <button
      type="button"
      onClick={() => {
        if (!isPro) void activate();
      }}
      disabled={busy || isPro}
      className={`border font-mono uppercase transition-colors disabled:opacity-60 ${
        compact
          ? `rounded-full px-3 py-2 text-[9px] tracking-[.16em] ${
              isPro
                ? 'border-emerald-500/28 bg-emerald-500/12 text-emerald-300'
                : 'border-[var(--gold-line)] bg-[var(--gold-dim)]/88 text-gold hover:bg-gold/20'
            }`
          : `rounded-[8px] px-2.5 py-1 text-[9px] tracking-[.12em] ${
              isPro
                ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-300'
                : 'border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold hover:bg-gold/20'
            }`
      }`}
    >
      {busy ? '...' : isPro ? 'Pro ✓' : 'Pro'}
    </button>
  );
}
