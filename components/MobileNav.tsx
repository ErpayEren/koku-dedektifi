'use client';

import { usePathname, useRouter } from 'next/navigation';

type IconProps = { size: number; strokeWidth: number };

const ITEMS = [
  { key: 'analiz', href: '/', label: 'Analiz', aria: 'Analiz sayfasına git', Icon: AnalysisIcon },
  { key: 'dolap', href: '/dolap', label: 'Dolap', aria: 'Koku dolabım', Icon: WardrobeIcon },
  { key: 'kesfet', href: '/akis', label: 'Keşfet', aria: 'Keşfet', Icon: ExploreIcon },
  { key: 'profil', href: '/hesap', label: 'Profil', aria: 'Profil sayfasına git', Icon: ProfileIcon },
] as const;

export function MobileNav() {
  const path = usePathname();
  const router = useRouter();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[.06] bg-[var(--bg-card)]/95 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      role="navigation"
      aria-label="Mobil menü"
    >
      <div className="grid grid-cols-4">
        {ITEMS.map(({ key, href, label, aria, Icon }) => {
          const active = path === href;
          return (
            <button
              key={key}
              className={`mnav-item relative flex flex-col items-center gap-1 py-3 text-[9px] font-mono uppercase tracking-[.06em] transition-colors ${
                active ? 'text-gold' : 'text-muted hover:text-cream'
              }`}
              onClick={() => router.push(href)}
              aria-label={aria}
              aria-current={active ? 'page' : undefined}
              type="button"
            >
              <Icon size={18} strokeWidth={1.45} />
              <span>{label}</span>
              <span className={`absolute left-4 right-4 top-0 h-px ${active ? 'bg-[var(--gold-line)]' : 'bg-transparent'}`} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function AnalysisIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true" focusable="false">
      <circle cx="9" cy="9" r="7" />
      <circle cx="9" cy="9" r="2.2" />
    </svg>
  );
}

function WardrobeIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true" focusable="false">
      <path d="M3 15V7l6-5 6 5v8" />
      <rect x="6" y="10" width="6" height="5" />
    </svg>
  );
}

function ExploreIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true" focusable="false">
      <circle cx="9" cy="9" r="3" />
      <path d="M9 2v2M9 14v2M2 9h2M14 9h2M4.2 4.2l1.4 1.4M12.4 12.4l1.4 1.4M4.2 13.8l1.4-1.4M12.4 5.6l1.4-1.4" />
    </svg>
  );
}

function ProfileIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true" focusable="false">
      <circle cx="9" cy="6" r="3" />
      <path d="M2 17c0-4 3.13-6 7-6s7 2 7 6" />
    </svg>
  );
}
