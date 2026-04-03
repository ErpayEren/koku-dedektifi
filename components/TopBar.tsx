'use client';

import { useRouter } from 'next/navigation';
import { useInstallPrompt } from '@/lib/client/useInstallPrompt';
import { Logo } from './ui/Logo';
import { ProBadge } from './ui/ProBadge';

export function TopBar({ title }: { title?: string }) {
  const router = useRouter();
  const { canInstall, install } = useInstallPrompt();

  return (
    <header
      className="flex h-[92px] items-center justify-between px-4 sm:px-5 md:px-12
                 sticky top-0 bg-bg/85 backdrop-blur-xl z-10"
    >
      <div className="md:hidden">
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
          onClick={() => router.push('/hesap')}
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
