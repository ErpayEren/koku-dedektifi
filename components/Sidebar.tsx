'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { UI } from '@/lib/strings';
import { getHistory } from '@/lib/client/storage';
import { Logo } from './ui/Logo';

const NAV = [
  {
    section: 'Analiz',
    items: [
      { label: UI.newAnalysis, href: '/' },
      { label: UI.history, href: '/gecmis' },
      { label: UI.compare, href: '/karsilastir' },
    ],
  },
  {
    section: 'Koleksiyon',
    items: [
      { label: UI.wardrobe, href: '/dolap' },
      { label: UI.wearTracker, href: '/wear' },
      { label: UI.layeringLab, href: '/layering' },
    ],
  },
  {
    section: 'Keşfet',
    items: [
      { label: UI.noteFinder, href: '/notalar' },
      { label: UI.barcodeScanner, href: '/barkod' },
      { label: UI.feed, href: '/akis' },
    ],
  },
] as const;

const MODES = [
  { key: 'photo', label: UI.photoTab },
  { key: 'text', label: UI.textTab },
  { key: 'notes', label: UI.notesTab },
] as const;

const DAILY_LIMIT = 30;

function getTodayCount(): number {
  const today = new Date().toISOString().slice(0, 10);
  return getHistory().filter((row) => String(row.createdAt || '').slice(0, 10) === today).length;
}

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const [mode, setMode] = useState('photo');
  const [todayUsage, setTodayUsage] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const current = new URLSearchParams(window.location.search).get('mode');
    setMode(current || 'photo');
    setTodayUsage(getTodayCount());
  }, [path]);

  const usagePct = useMemo(() => Math.max(0, Math.min(100, Math.round((todayUsage / DAILY_LIMIT) * 100))), [todayUsage]);

  return (
    <aside className="hidden md:flex flex-col w-[272px] flex-shrink-0 sticky top-0 h-screen border-r border-white/[.06] py-8 z-20">
      <div className="px-7 pb-8 border-b border-white/[.06]">
        <div className="mb-7">
          <Logo />
        </div>

        <div className="flex border border-white/[.06] rounded-lg overflow-hidden bg-[var(--bg-card)]">
          {MODES.map((entry) => {
            const active = path === '/' && mode === entry.key;
            return (
              <button
                key={entry.key}
                type="button"
                onClick={() => {
                  setMode(entry.key);
                  router.push(`/?mode=${entry.key}`);
                }}
                className={`flex-1 py-2 text-[11px] font-mono tracking-[.06em] uppercase transition-all
                ${active ? 'text-cream bg-[var(--bg-raise)]' : 'text-muted hover:text-cream'}`}
              >
                {entry.label}
              </button>
            );
          })}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6">
        {NAV.map((group) => (
          <div key={group.section} className="mb-6">
            <p className="text-[9px] font-mono tracking-[.14em] uppercase text-hint px-7 mb-2">{group.section}</p>
            {group.items.map((item) => {
              const active = path === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-7 py-2.5 text-[13px] transition-all border-l-2 no-underline
                  ${active
                    ? 'border-gold text-cream bg-gradient-to-r from-[var(--gold-dim)] to-transparent'
                    : 'border-transparent text-muted hover:text-cream hover:bg-[var(--bg-raise)]'
                  }`}
                >
                  <div className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${active ? 'bg-gold' : 'bg-current opacity-40'}`} />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-7 pt-5 border-t border-white/[.06]">
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] font-mono text-muted">{UI.dailyUsage}</span>
            <span className="text-[10px] font-mono text-gold">
              {todayUsage}/{DAILY_LIMIT}
            </span>
          </div>
          <div className="h-[2px] bg-white/[.08] rounded-full overflow-hidden">
            <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${usagePct}%` }} />
          </div>
        </div>
        <Link
          href="/paketler"
          className="block w-full mt-3 py-2.5 text-center text-[11px] font-mono tracking-[.08em] uppercase border border-[var(--gold-line)] rounded text-gold bg-[var(--gold-dim)] hover:bg-gold/20 transition-colors"
        >
          {UI.upgradeToPro}
        </Link>
      </div>
    </aside>
  );
}

