'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CalendarDays,
  ChevronRight,
  FlaskConical,
  GitCompare,
  History,
  Layers,
  ScanLine,
  Search,
  Sparkles,
  UserRound,
  WalletCards,
  Wind,
  X,
  type LucideIcon,
} from 'lucide-react';
import { UI } from '@/lib/strings';

type IconProps = { size: number; strokeWidth: number };
type GroupKey = 'analiz' | 'koleksiyon' | 'kesfet' | 'profil';

interface GroupItem {
  href: Route;
  label: string;
  description: string;
  Icon: LucideIcon;
}

interface GroupDefinition {
  key: GroupKey;
  label: string;
  aria: string;
  Icon: (props: IconProps) => JSX.Element;
  items: readonly GroupItem[];
}

const GROUPS: readonly GroupDefinition[] = [
  {
    key: 'analiz',
    label: 'Analiz',
    aria: 'Analiz bölümü',
    Icon: AnalysisIcon,
    items: [
      {
        href: '/',
        label: UI.navNewAnalysis,
        description: 'Fotoğraf, metin veya nota listesi ile yeni analiz başlat.',
        Icon: Sparkles,
      },
      {
        href: '/gecmis',
        label: UI.navHistory,
        description: 'Önceki analizlerini yeniden aç ve karşılaştır.',
        Icon: History,
      },
      {
        href: '/karsilastir',
        label: UI.navCompare,
        description: 'İki kokuyu yan yana incele, farklarını gör.',
        Icon: GitCompare,
      },
    ],
  },
  {
    key: 'koleksiyon',
    label: 'Koleksiyon',
    aria: 'Koleksiyon bölümü',
    Icon: WardrobeIcon,
    items: [
      {
        href: '/dolap',
        label: UI.navWardrobe,
        description: 'Sahip olduklarını, favorilerini ve isteklerini yönet.',
        Icon: Archive,
      },
      {
        href: '/wear',
        label: UI.navWearRoutine,
        description: 'Günlük kullanım alışkanlığını ve özetlerini izle.',
        Icon: CalendarDays,
      },
      {
        href: '/layering',
        label: UI.navLayeringLab,
        description: 'İki parfümün birlikte vereceği etkiyi keşfet.',
        Icon: Layers,
      },
    ],
  },
  {
    key: 'kesfet',
    label: 'Keşfet',
    aria: 'Keşfet bölümü',
    Icon: ExploreIcon,
    items: [
      {
        href: '/notalar',
        label: UI.navNoteFinder,
        description: 'Aradığın profile yakın kokuları filtrele ve bul.',
        Icon: Search,
      },
      {
        href: '/haftalik-molekul',
        label: 'Haftalık Molekül',
        description: 'Her hafta öne çıkan imza molekülü ve kullanan parfümleri keşfet.',
        Icon: FlaskConical,
      },
      {
        href: '/barkod',
        label: UI.navBarcode,
        description: 'Barkod üzerinden hızlı ürün araması yap.',
        Icon: ScanLine,
      },
      {
        href: '/akis',
        label: UI.navFeed,
        description: 'Topluluk hareketlerini ve son etkinlikleri gör.',
        Icon: Wind,
      },
    ],
  },
  {
    key: 'profil',
    label: 'Profil',
    aria: 'Profil bölümü',
    Icon: ProfileIcon,
    items: [
      {
        href: '/profil' as Route,
        label: 'Hesap',
        description: 'Giriş, tercih ve kişisel profil ayarlarını yönet.',
        Icon: UserRound,
      },
      {
        href: '/paketler',
        label: 'Paketler',
        description: 'Ücretsiz ve Pro planları karşılaştır, yükselt.',
        Icon: WalletCards,
      },
    ],
  },
] as const;

export function MobileNav() {
  const path = usePathname();
  const [openGroup, setOpenGroup] = useState<GroupKey | null>(null);

  const activeGroupKey = useMemo<GroupKey>(() => {
    const match = GROUPS.find((group) => group.items.some((item) => item.href === path));
    return match?.key ?? 'analiz';
  }, [path]);

  const currentGroup = useMemo(() => {
    const targetKey = openGroup ?? activeGroupKey;
    return GROUPS.find((group) => group.key === targetKey) ?? GROUPS[0];
  }, [activeGroupKey, openGroup]);

  useEffect(() => {
    setOpenGroup(null);
  }, [path]);

  const sheetOpen = openGroup !== null;

  return (
    <>
      {sheetOpen ? (
        <button
          type="button"
          aria-label="Mobil menüyü kapat"
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] md:hidden"
          onClick={() => setOpenGroup(null)}
        />
      ) : null}

      {sheetOpen ? (
        <section
          className="fixed left-3 right-3 z-50 rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(26,23,31,0.98),rgba(15,13,19,0.98))] shadow-[0_28px_80px_rgba(0,0,0,0.48)] backdrop-blur-2xl md:hidden"
          style={{ bottom: 'calc(var(--mobile-nav-h) + env(safe-area-inset-bottom) + 12px)' }}
          aria-label={`${currentGroup.label} hızlı erişim paneli`}
        >
          <div className="flex items-center justify-between border-b border-white/[0.07] px-4 pb-3 pt-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/30">Mobil kısayollar</p>
              <h3 className="mt-1 text-base font-medium text-white">{currentGroup.label}</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpenGroup(null)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/50 transition-colors hover:text-white active:bg-white/[0.08]"
              aria-label="Paneli kapat"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>

          <div className="scrollbar-none flex max-h-[min(58vh,420px)] flex-col gap-2 overflow-y-auto px-3 py-3">
            {currentGroup.items.map((item) => {
              const isActive = path === item.href;
              const ItemIcon = item.Icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpenGroup(null)}
                  className={`flex items-start gap-3 rounded-2xl border px-3 py-3.5 transition-all duration-200 ${
                    isActive
                      ? 'border-amber-500/35 bg-amber-500/10'
                      : 'border-white/[0.08] bg-white/[0.03] active:bg-white/[0.08]'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                      isActive
                        ? 'border-amber-500/30 bg-amber-500/12 text-amber-400'
                        : 'border-white/[0.08] bg-white/[0.05] text-white/50'
                    }`}
                  >
                    <ItemIcon className="h-4 w-4" strokeWidth={1.9} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`truncate text-sm font-medium ${isActive ? 'text-white' : 'text-white/88'}`}>
                        {item.label}
                      </p>
                      {isActive ? (
                        <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-amber-300">
                          Aktif
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-white/42">{item.description}</p>
                  </div>

                  <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-white/28" strokeWidth={1.8} />
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[.06] bg-[var(--bg-card)]/95 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        role="navigation"
        aria-label="Mobil menü"
      >
        <div className="grid grid-cols-4">
          {GROUPS.map(({ key, label, aria, Icon }) => {
            const isActive = activeGroupKey === key;
            const isOpen = openGroup === key;

            return (
              <button
                key={key}
                type="button"
                aria-label={aria}
                aria-expanded={isOpen}
                className={`mnav-item relative flex flex-col items-center gap-1 py-3 text-[9px] font-mono uppercase tracking-[.06em] transition-colors ${
                  isActive || isOpen ? 'text-gold' : 'text-muted hover:text-cream'
                }`}
                onClick={() => setOpenGroup((current) => (current === key ? null : key))}
              >
                <Icon size={18} strokeWidth={1.45} />
                <span>{label}</span>
                <span
                  className={`absolute left-4 right-4 top-0 h-px ${
                    isActive || isOpen ? 'bg-[var(--gold-line)]' : 'bg-transparent'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </nav>
    </>
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
