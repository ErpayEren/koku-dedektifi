'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CalendarDays,
  FlaskConical,
  GitCompare,
  History,
  Layers,
  ScanLine,
  Search,
  Sparkles,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { getHistory } from '@/lib/client/storage';
import { useBillingEntitlement } from '@/lib/client/useBillingEntitlement';
import { UI } from '@/lib/strings';
import { Logo } from './ui/Logo';

interface NavItem {
  label: string;
  href: Route;
  Icon: LucideIcon;
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    section: 'ANALİZ',
    items: [
      { label: 'Yeni Analiz', href: '/', Icon: Sparkles },
      { label: 'Koku Geçmişi', href: '/gecmis', Icon: History },
      { label: 'Karşılaştır', href: '/karsilastir', Icon: GitCompare },
    ],
  },
  {
    section: 'KOLEKSİYON',
    items: [
      { label: 'Koku Dolabım', href: '/dolap', Icon: Archive },
      { label: 'Koku Rutinim', href: '/wear', Icon: CalendarDays },
      { label: 'Katmanlama Lab', href: '/layering', Icon: Layers },
    ],
  },
  {
    section: 'KEŞFET',
    items: [
      { label: 'Nota Avcısı', href: '/notalar', Icon: Search },
      { label: 'Haftalık Molekül', href: '/haftalik-molekul', Icon: FlaskConical },
      { label: 'Barkod Tara', href: '/barkod', Icon: ScanLine },
      { label: 'Koku Akışı', href: '/akis', Icon: Wind },
    ],
  },
];

function getTodayCount(): number {
  const today = new Date().toISOString().slice(0, 10);
  return getHistory().filter((row) => String(row.createdAt || '').slice(0, 10) === today).length;
}

export function Sidebar() {
  const path = usePathname();
  const entitlement = useBillingEntitlement();
  const [todayUsage, setTodayUsage] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setTodayUsage(getTodayCount());
  }, [path]);

  const usagePct = useMemo(() => {
    if (entitlement.dailyAnalysisLimit >= 9999) {
      return Math.min(100, todayUsage * 8);
    }
    return Math.min(100, Math.round((todayUsage / Math.max(1, entitlement.dailyAnalysisLimit)) * 100));
  }, [entitlement.dailyAnalysisLimit, todayUsage]);

  const usageLabel = entitlement.dailyAnalysisLimit >= 9999 ? '∞' : String(entitlement.dailyAnalysisLimit);

  return (
    <aside className="order-2 z-20 hidden w-full min-w-0 border-t border-white/[.06] py-4 md:order-1 md:flex md:w-64 md:min-w-[280px] md:shrink-0 md:self-start md:sticky md:top-0 md:h-screen md:border-r md:border-t-0 md:py-0 lg:w-80">
      <div className="flex h-full w-full flex-col rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm md:rounded-none md:border-0 md:bg-transparent md:backdrop-blur-0">
        <div className="flex h-[92px] shrink-0 items-center gap-3 px-5 md:px-6">
          <Logo size="sidebar" />
        </div>

        <div className="mx-0 h-px w-full shrink-0 bg-white/[.08]" />

        <nav className="scrollbar-none flex-1 overflow-y-auto py-4" role="navigation" aria-label="Ana menü">
          {NAV.map((category, groupIndex) => (
            <div key={category.section}>
              <p
                className={`px-4 text-[10px] font-medium tracking-[0.2em] text-white/30 ${
                  groupIndex === 0 ? 'mb-1 mt-0' : 'mb-1 mt-6'
                }`}
              >
                {category.section}
              </p>

              {category.items.map((item) => {
                const isActive = path === item.href;
                const Icon = item.Icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`mx-2 flex min-h-[48px] items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${
                      isActive
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'text-white/60 hover:bg-white/5 hover:text-white/90 active:bg-white/8'
                    }`}
                  >
                    <span className={`h-4 w-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-white/40'}`}>
                      <Icon className="h-4 w-4" strokeWidth={1.85} />
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                    {isActive ? <div className="ml-auto h-4 w-1 rounded-full bg-amber-400" /> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/[.08] px-4 pb-8 pt-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="text-[11px] tracking-wide text-white/40">{UI.navDailyLimit}</span>
            <span className="text-[11px] font-medium text-amber-400">
              {todayUsage}/{usageLabel}
            </span>
          </div>

          <div className="mb-4 h-px bg-white/[.08]" />

          <div className="mb-4 h-[3px] overflow-hidden rounded-full bg-white/[.08]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${usagePct}%`,
                background: usagePct >= 80 ? 'var(--danger)' : 'linear-gradient(90deg, #d97706 0%, #f59e0b 100%)',
              }}
            />
          </div>

          <Link
            href="/paketler"
            className="block w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-3.5 text-center text-sm font-bold tracking-widest text-black shadow-[0_4px_20px_rgba(217,119,6,0.35)] transition-transform active:scale-[0.98]"
          >
            {"PRO'YA GEÇ"}
          </Link>
        </div>
      </div>
    </aside>
  );
}
