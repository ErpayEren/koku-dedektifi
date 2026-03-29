'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type IconProps = { size: number; strokeWidth: number };

const ITEMS = [
  { href: '/', label: 'Analiz', Icon: AnalysisIcon },
  { href: '/dolap', label: 'Dolap', Icon: WardrobeIcon },
  { href: '/akis', label: 'Akış', Icon: ExploreIcon },
  { href: '/hesap', label: 'Profil', Icon: ProfileIcon },
] as const;

export function MobileNav() {
  const path = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[.06] bg-[var(--bg-card)]/95 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-4">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-1 py-3 transition-colors text-[9px] font-mono tracking-[.06em] uppercase no-underline
              ${active ? 'text-gold' : 'text-muted hover:text-cream'}`}
            >
              <Icon size={18} strokeWidth={1.45} />
              {label}
              <span className={`absolute left-4 right-4 top-0 h-px ${active ? 'bg-[var(--gold-line)]' : 'bg-transparent'}`} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function AnalysisIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
      <circle cx="9" cy="9" r="7" />
      <circle cx="9" cy="9" r="2.2" />
    </svg>
  );
}

function WardrobeIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
      <path d="M3 15V7l6-5 6 5v8" />
      <rect x="6" y="10" width="6" height="5" />
    </svg>
  );
}

function ExploreIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
      <circle cx="9" cy="9" r="3" />
      <path d="M9 2v2M9 14v2M2 9h2M14 9h2M4.2 4.2l1.4 1.4M12.4 12.4l1.4 1.4M4.2 13.8l1.4-1.4M12.4 5.6l1.4-1.4" />
    </svg>
  );
}

function ProfileIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
      <circle cx="9" cy="6" r="3" />
      <path d="M2 17c0-4 3.13-6 7-6s7 2 7 6" />
    </svg>
  );
}

