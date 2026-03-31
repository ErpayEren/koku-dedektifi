'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getHistory } from '@/lib/client/storage';
import { UI } from '@/lib/strings';
import { Logo } from './ui/Logo';

const NAV = [
  {
    section: 'Analiz',
    items: [
      { label: UI.navNewAnalysis, href: '/' },
      { label: UI.navHistory, href: '/gecmis' },
      { label: UI.navCompare, href: '/karsilastir' },
    ],
  },
  {
    section: 'Koleksiyon',
    items: [
      { label: UI.navWardrobe, href: '/dolap' },
      { label: UI.navWearRoutine, href: '/wear' },
      { label: UI.navLayeringLab, href: '/layering' },
    ],
  },
  {
    section: 'Keşfet',
    items: [
      { label: UI.navNoteFinder, href: '/notalar' },
      { label: UI.navBarcode, href: '/barkod' },
      { label: UI.navFeed, href: '/akis' },
    ],
  },
] as const;

const DAILY_LIMIT = 5;

function getTodayCount(): number {
  const today = new Date().toISOString().slice(0, 10);
  return getHistory().filter((row) => String(row.createdAt || '').slice(0, 10) === today).length;
}

export function Sidebar() {
  const path = usePathname();
  const [todayUsage, setTodayUsage] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setTodayUsage(getTodayCount());
  }, [path]);

  const usagePct = useMemo(
    () => Math.max(0, Math.min(100, Math.round((todayUsage / DAILY_LIMIT) * 100))),
    [todayUsage],
  );

  return (
    <aside className="sticky top-0 z-20 hidden h-screen w-[272px] flex-shrink-0 border-r border-white/[.06] py-8 md:flex">
      <div className="flex h-full w-full flex-col">
        <div className="border-b border-white/[.06] px-6 pb-6">
          <Logo size="sidebar" />
        </div>

        <nav className="flex-1 overflow-y-auto py-6" role="navigation" aria-label="Ana menü">
          {NAV.map((group) => (
            <div key={group.section} className="mb-6">
              <p className="mb-2 px-7 text-[9px] font-mono uppercase tracking-[.14em] text-hint">
                {group.section}
              </p>
              {group.items.map((item) => {
                const active = path === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 border-l-2 px-7 py-2.5 text-[13px] no-underline transition-all ${
                      active
                        ? 'border-gold bg-gradient-to-r from-[var(--gold-dim)] to-transparent text-cream'
                        : 'border-transparent text-muted hover:bg-[var(--bg-raise)] hover:text-cream'
                    }`}
                  >
                    <div
                      className={`h-[5px] w-[5px] flex-shrink-0 rounded-full ${
                        active ? 'bg-gold' : 'bg-current opacity-40'
                      }`}
                    />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/[.06] px-7 pt-5">
          <div>
            <div className="mb-1.5 flex justify-between">
              <span className="text-[10px] font-mono text-muted">{UI.navDailyLimit}</span>
              <span className="text-[10px] font-mono text-gold">
                {todayUsage}/{DAILY_LIMIT}
              </span>
            </div>
            <div className="h-[2px] overflow-hidden rounded-full bg-white/[.08]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${usagePct}%`,
                  background: usagePct >= 80 ? 'var(--danger)' : 'var(--gold)',
                }}
              />
            </div>
          </div>

          <Link
            href="/paketler"
            className="mt-3 block w-full rounded border border-[var(--gold-line)] bg-[var(--gold-dim)] py-2.5 text-center text-[11px] font-mono uppercase tracking-[.08em] text-gold transition-colors hover:bg-gold/20"
          >
            {UI.navUpgrade}
          </Link>
        </div>
      </div>
    </aside>
  );
}
