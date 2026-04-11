'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  X,
  type LucideIcon,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

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
    section: 'analiz',
    items: [
      { label: 'Yeni Analiz', href: '/', Icon: Sparkles },
      { label: 'Koku Geçmişi', href: '/gecmis', Icon: History },
      { label: 'Karşılaştır', href: '/karsilastir', Icon: GitCompare },
    ],
  },
  {
    section: 'koleksiyon',
    items: [
      { label: 'Koku Dolabım', href: '/dolap', Icon: Archive },
      { label: 'Koku Rutinim', href: '/wear', Icon: CalendarDays },
      { label: 'Katmanlama Lab', href: '/layering', Icon: Layers },
    ],
  },
  {
    section: 'keşfet',
    items: [
      { label: 'Nota Avcısı', href: '/notalar', Icon: Search },
      { label: 'Haftalık Molekül', href: '/haftalik-molekul', Icon: FlaskConical },
      { label: 'Barkod Tara', href: '/barkod', Icon: ScanLine },
      { label: 'Koku Akışı', href: '/akis', Icon: Wind },
    ],
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openMenu = () => setOpen(true);
    window.addEventListener('kd-mobile-nav:open', openMenu);
    return () => window.removeEventListener('kd-mobile-nav:open', openMenu);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Menüyü kapat"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px] md:hidden"
        />
      ) : null}

      <aside
        aria-label="Mobil menü"
        className={`fixed inset-y-0 left-0 z-50 w-[min(86vw,320px)] border-r border-white/[.08] bg-[rgba(11,11,18,0.96)] shadow-[0_20px_80px_rgba(0,0,0,.55)] backdrop-blur-xl transition-transform duration-300 ease-out md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[88px] items-center justify-between border-b border-white/[.06] px-4">
          <Logo size="sm" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[.08] bg-white/[.03] text-muted transition-colors hover:text-cream hover:border-white/[.15]"
            aria-label="Kapat"
          >
            <X className="h-[16px] w-[16px]" strokeWidth={1.9} />
          </button>
        </div>

        <nav className="scrollbar-none h-[calc(100dvh-88px)] overflow-y-auto px-3 py-4">
          {NAV.map((group, groupIndex) => (
            <div key={group.section} className={groupIndex === 0 ? '' : 'mt-4'}>
              <p
                className="mb-2 px-2 text-[10px] font-mono tracking-[.16em] text-hint uppercase"
                style={{ textTransform: 'uppercase' }}
              >
                {group.section}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.Icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex min-h-[48px] items-center gap-3 rounded-2xl px-3 py-2 transition-colors ${
                        isActive
                          ? 'border border-amber-500/25 bg-amber-500/10 text-amber-300'
                          : 'border border-white/[.06] bg-white/[.02] text-white/75'
                      }`}
                    >
                      <span
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${
                          isActive ? 'bg-amber-500/15 text-amber-300' : 'bg-white/[.03] text-white/55'
                        }`}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.9} />
                      </span>
                      <span className="text-[14px] font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

