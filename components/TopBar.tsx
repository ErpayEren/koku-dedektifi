'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useInstallPrompt } from '@/lib/client/useInstallPrompt';
import { impactHaptic } from '@/lib/mobile/capacitor';
import { useNativeShell } from '@/lib/mobile/useNativeShell';
import { Logo } from './ui/Logo';
import { ProBadge } from './ui/ProBadge';

export function TopBar({ title }: { title?: string }) {
  const router = useRouter();
  const { canInstall, install } = useInstallPrompt();
  const nativeShell = useNativeShell();

  return (
    <header className="sticky top-0 z-20 border-b border-white/[.04] bg-[rgba(9,8,10,0.84)] px-4 py-3 pt-[max(env(safe-area-inset-top),12px)] backdrop-blur-2xl sm:px-5 md:min-h-[92px] md:border-b-0 md:bg-bg/88 md:px-12 md:py-0">
      <div className="hidden min-h-[92px] items-center justify-between md:flex">
        <span className="text-[15px] font-semibold text-muted">{title ?? 'Koku Dedektifi'}</span>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {!nativeShell && canInstall ? (
            <button
              type="button"
              onClick={() => void install()}
              className="inline-flex items-center justify-center rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)] px-2.5 py-2 text-[9px] font-mono uppercase tracking-[.08em] text-gold transition-colors hover:bg-gold hover:text-bg sm:px-3 sm:text-[10px]"
            >
              <span className="sm:hidden">Ekle</span>
              <span className="hidden sm:inline">Ana ekrana ekle</span>
            </button>
          ) : null}
          <ProBadge />
          <button
            type="button"
            onClick={() => {
              void impactHaptic('light');
              router.push('/profil' as Route);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[.06] text-muted transition-all hover:border-white/[.10] hover:bg-raise hover:text-cream"
            aria-label="Profil"
          >
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="9" cy="6" r="3" />
              <path d="M2 17c0-4 3.13-6 7-6s7 2 7 6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="md:hidden">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              void impactHaptic('light');
              window.dispatchEvent(new CustomEvent('kd-mobile-nav:open'));
            }}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[.08] bg-white/[.03] text-muted transition-colors hover:border-white/[.15] hover:text-cream"
            aria-label="Menüyü aç"
          >
            <Menu className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </button>

          <div className="min-w-0 flex-1 px-1">
            <Logo size="sm" />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ProBadge compact />
            <button
              type="button"
              onClick={() => {
                void impactHaptic('light');
                router.push('/profil' as Route);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[.06] bg-white/[.02] text-muted transition-all hover:border-white/[.10] hover:bg-raise hover:text-cream"
              aria-label="Profil"
            >
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="9" cy="6" r="3" />
                <path d="M2 17c0-4 3.13-6 7-6s7 2 7 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
