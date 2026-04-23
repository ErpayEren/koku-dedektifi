'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  BookOpen,
  Compass,
  FlaskConical,
  GitCompare,
  History,
  Info,
  Layers,
  ScanLine,
  Search,
  Sparkles,
  Wind,
  X,
  type LucideIcon,
} from 'lucide-react';
import { impactHaptic } from '@/lib/mobile/capacitor';
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
      { label: 'Katmanlama Lab', href: '/layering', Icon: Layers },
    ],
  },
  {
    section: 'keşfet',
    items: [
      { label: 'Keşfet', href: '/kesfet', Icon: Compass },
      { label: 'Nota Avcısı', href: '/notalar', Icon: Search },
      { label: 'Haftalık Molekül', href: '/haftalik-molekul', Icon: FlaskConical },
      { label: 'Barkod Tara', href: '/barkod', Icon: ScanLine },
      { label: 'Koku Akışı', href: '/akis', Icon: Wind },
    ],
  },
  {
    section: 'hakkında',
    items: [
      { label: 'Blog', href: '/blog' as Route, Icon: BookOpen },
      { label: 'Nasıl Çalışır?', href: '/nasil-calisir' as Route, Icon: Info },
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

  const currentItem = useMemo(() => {
    for (const group of NAV) {
      const match = group.items.find((item) => item.href === pathname);
      if (match) return match;
    }
    return NAV[0]?.items[0];
  }, [pathname]);

  if (!currentItem) {
    return null;
  }

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Menüyü kapat"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] md:hidden"
        />
      ) : null}

      <aside
        aria-label="Mobil menü"
        className={`fixed inset-x-0 top-0 z-50 md:hidden ${
          open ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div
          className={`mx-2 mt-[max(env(safe-area-inset-top),8px)] overflow-hidden rounded-[30px] border border-white/[.08] bg-[rgba(11,11,18,0.97)] shadow-[0_28px_90px_rgba(0,0,0,.58)] backdrop-blur-2xl transition-all duration-300 ease-out ${
            open ? 'translate-y-0 opacity-100' : '-translate-y-6 opacity-0'
          }`}
        >
          <div className="border-b border-white/[.06] px-4 pb-4 pt-4">
            <div className="flex items-center justify-between gap-3">
              <Logo size="sm" />
              <button
                type="button"
                onClick={() => {
                  void impactHaptic('light');
                  setOpen(false);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/[.08] bg-white/[.03] text-muted transition-colors hover:border-white/[.15] hover:text-cream"
                aria-label="Kapat"
              >
                <X className="h-[16px] w-[16px]" strokeWidth={1.9} />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-[22px] border border-white/[.06] bg-white/[.02] px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-[.16em] text-gold/80">Şu an açık ekran</p>
                <p className="mt-1 truncate text-[15px] font-semibold text-cream">{currentItem.label}</p>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-500/22 bg-amber-500/10 text-amber-300">
                <currentItem.Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
              </span>
            </div>
          </div>

          <nav
            className="scrollbar-none max-h-[min(74dvh,640px)] overflow-y-auto px-3 py-3"
            role="navigation"
            aria-label="Ana menü"
          >
            {NAV.map((group) => (
              <div key={group.section} className="mt-2 first:mt-0">
                <p className="mb-2 px-2 text-[10px] font-mono uppercase tracking-[.16em] text-hint">{group.section}</p>

                <div className="grid grid-cols-1 gap-2">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.Icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          void impactHaptic('light');
                        }}
                        className={`flex min-h-[56px] items-center gap-3 rounded-[22px] border px-3.5 py-3 transition-all ${
                          isActive
                            ? 'border-amber-500/25 bg-amber-500/10 text-amber-300 shadow-[0_0_0_1px_rgba(245,158,11,0.06)]'
                            : 'border-white/[.06] bg-white/[.02] text-white/75'
                        }`}
                      >
                        <span
                          className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${
                            isActive ? 'bg-amber-500/14 text-amber-300' : 'bg-white/[.03] text-white/55'
                          }`}
                        >
                          <Icon className="h-[17px] w-[17px]" strokeWidth={1.9} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium">{item.label}</p>
                        </div>
                        {isActive ? <span className="h-4 w-1 rounded-full bg-amber-400/90" /> : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
