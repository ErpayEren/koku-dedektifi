'use client';

import { useRouter } from 'next/navigation';
import { Logo } from './ui/Logo';
import { ProBadge } from './ui/ProBadge';

export function TopBar({ title }: { title?: string }) {
  const router = useRouter();

  return (
    <header
      className="flex items-center justify-between px-5 md:px-12 py-4 md:py-5
                 border-b border-white/[.06] sticky top-0 bg-bg/85 backdrop-blur-xl z-10"
    >
      <div className="md:hidden">
        <Logo size="sm" />
      </div>
      <span className="hidden md:block font-display italic text-[15px] text-muted">
        {title ?? 'Koku Dedektifi'}
      </span>

      <div className="flex items-center gap-3">
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

