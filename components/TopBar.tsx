'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useInstallPrompt } from '@/lib/client/useInstallPrompt';
import { Logo } from './ui/Logo';
import { ProBadge } from './ui/ProBadge';

export function TopBar({ title }: { title?: string }) {
  const router = useRouter();
  const { canInstall, install } = useInstallPrompt();

  return (
    <header
      className="sticky top-0 z-10 flex min-h-[96px] items-center justify-between bg-bg/88 px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)] backdrop-blur-xl sm:px-5 md:h-[92px] md:min-h-0 md:px-12 md:py-0"
    >
      <div className="flex items-center gap-3 md:hidden">
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('kd-mobile-nav:open'));
          }}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/[.08] bg-white/[.03] text-muted transition-colors hover:text-cream hover:border-white/[.15]"
          aria-label="Menüyü aç"
        >
          <Menu className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </button>
        <Logo size="sm" />
      </div>
      <span className="hidden md:block text-[15px] font-semibold text-muted">
        {title ?? 'Koku Dedektifi'}
      </span>

      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {canInstall ? (
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
          onClick={() => router.push('/profil' as Route)}
          className="w-8 h-8 rounded-full border border-white/[.06]
                     flex items-center justify-center text-muted
                     hover:border-white/[.10] hover:text-cream hover:bg-raise transition-all"
          aria-label="Profil"
        >
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="9" cy="6" r="3" />
            <path d="M2 17c0-4 3.13-6 7-6s7 2 7 6" />
          </svg>
        </button>
      </div>
    </header>
  );
}
