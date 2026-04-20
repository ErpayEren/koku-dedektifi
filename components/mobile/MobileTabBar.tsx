'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { Archive, History, Sparkles, UserRound } from 'lucide-react';
import { impactHaptic } from '@/lib/mobile/capacitor';

const NAV_ITEMS = [
  { href: '/', label: 'Analiz', Icon: Sparkles },
  { href: '/gecmis', label: 'Geçmiş', Icon: History },
  { href: '/dolap', label: 'Dolap', Icon: Archive },
  { href: '/profil', label: 'Profil', Icon: UserRound },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden">
      <div className="pointer-events-auto border-t border-white/[.08] bg-[rgba(11,11,18,0.94)] px-2 pb-[max(env(safe-area-inset-bottom),10px)] pt-2 backdrop-blur-2xl shadow-[0_-14px_40px_rgba(0,0,0,.42)]">
        <div className="grid grid-cols-4 gap-1 rounded-[24px] border border-white/[.05] bg-black/10 px-1 py-1.5">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = pathname === href;

            return (
              <Link
                key={href}
                href={href as Route}
                onClick={() => {
                  void impactHaptic('light');
                }}
                className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[18px] px-1 transition-all ${
                  active ? 'text-amber-300' : 'text-white/48'
                }`}
              >
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                    active ? 'bg-amber-500/12 shadow-[0_0_18px_rgba(245,158,11,0.10)]' : 'bg-transparent'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.05 : 1.9} />
                </span>
                <span className="text-[10px] font-mono uppercase tracking-[.11em]">{label}</span>
                <span
                  className={`absolute bottom-0 h-[2px] rounded-full bg-amber-400 transition-all ${
                    active ? 'w-8 opacity-100' : 'w-0 opacity-0'
                  }`}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
