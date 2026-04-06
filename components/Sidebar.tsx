'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FocusEvent } from 'react';
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
import { useInstantProUpgrade } from '@/lib/client/useInstantProUpgrade';
import { useUserStore } from '@/lib/store/userStore';
import { Logo } from './ui/Logo';
import { LogoMark } from './ui/LogoMark';

interface NavItem {
  label: string;
  href: Route;
  Icon: LucideIcon;
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

const EXPANDED_WIDTH = 304;
const COLLAPSED_WIDTH = 88;
const RAIL_BREAKPOINT = 1280;
const RAIL_SCROLL_THRESHOLD = 120;
const HOVER_COLLAPSE_DELAY_MS = 340;
const SCROLL_SETTLE_COLLAPSE_MS = 320;

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
  const pathname = usePathname();
  const entitlement = useBillingEntitlement();
  const { activate, busy: upgradeBusy } = useInstantProUpgrade();
  const isPro = useUserStore((state) => state.isPro);

  const placeholderRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const hoverCollapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [todayUsage, setTodayUsage] = useState(0);
  const [panelLeft, setPanelLeft] = useState(0);
  const [canRailCollapse, setCanRailCollapse] = useState(false);
  const [scrolledPastThreshold, setScrolledPastThreshold] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [scrollFade, setScrollFade] = useState({ top: false, bottom: true });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setTodayUsage(getTodayCount());
  }, [pathname, entitlement.tier]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const measure = () => {
      const rect = placeholderRef.current?.getBoundingClientRect();
      setPanelLeft(rect?.left ?? 0);
    };

    const handleResize = () => {
      const railEnabled = window.innerWidth >= RAIL_BREAKPOINT;
      setCanRailCollapse(railEnabled);
      if (!railEnabled) {
        setScrolledPastThreshold(false);
        setHoverExpanded(false);
      }
      measure();
    };

    handleResize();

    const observer = new ResizeObserver(() => measure());
    if (placeholderRef.current) {
      observer.observe(placeholderRef.current);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleScroll = () => {
      if (!canRailCollapse) {
        setScrolledPastThreshold(false);
        return;
      }

      const passed = window.scrollY > RAIL_SCROLL_THRESHOLD;
      if (!passed) {
        if (scrollSettleTimerRef.current) {
          clearTimeout(scrollSettleTimerRef.current);
        }
        setHoverExpanded(false);
        setScrolledPastThreshold(false);
        return;
      }

      if (scrollSettleTimerRef.current) {
        clearTimeout(scrollSettleTimerRef.current);
      }

      scrollSettleTimerRef.current = setTimeout(() => {
        setScrolledPastThreshold(true);
      }, SCROLL_SETTLE_COLLAPSE_MS);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [canRailCollapse]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;

    const updateFade = () => {
      const { scrollTop, scrollHeight, clientHeight } = nav;
      setScrollFade({
        top: scrollTop > 6,
        bottom: scrollTop + clientHeight < scrollHeight - 6,
      });
    };

    updateFade();
    nav.addEventListener('scroll', updateFade, { passive: true });
    window.addEventListener('resize', updateFade);

    return () => {
      nav.removeEventListener('scroll', updateFade);
      window.removeEventListener('resize', updateFade);
    };
  }, [pathname, canRailCollapse]);

  useEffect(() => {
    return () => {
      if (hoverCollapseTimerRef.current) {
        clearTimeout(hoverCollapseTimerRef.current);
      }
      if (scrollSettleTimerRef.current) {
        clearTimeout(scrollSettleTimerRef.current);
      }
    };
  }, []);

  const collapsed = canRailCollapse && scrolledPastThreshold && !hoverExpanded;
  const sidebarWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;
  const usageLabel = entitlement.dailyAnalysisLimit >= 9999 ? '∞' : String(entitlement.dailyAnalysisLimit);

  const usagePct = useMemo(() => {
    if (entitlement.dailyAnalysisLimit >= 9999) {
      return Math.min(100, todayUsage * 8);
    }

    return Math.min(100, Math.round((todayUsage / Math.max(1, entitlement.dailyAnalysisLimit)) * 100));
  }, [entitlement.dailyAnalysisLimit, todayUsage]);

  const openRail = () => {
    if (!canRailCollapse || !scrolledPastThreshold) return;
    if (hoverCollapseTimerRef.current) {
      clearTimeout(hoverCollapseTimerRef.current);
    }
    setHoverExpanded(true);
  };

  const scheduleCollapse = () => {
    if (!canRailCollapse || !scrolledPastThreshold) return;
    if (hoverCollapseTimerRef.current) {
      clearTimeout(hoverCollapseTimerRef.current);
    }
    hoverCollapseTimerRef.current = setTimeout(() => {
      setHoverExpanded(false);
    }, HOVER_COLLAPSE_DELAY_MS);
  };

  const handleBlurCapture = (event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (!panelRef.current?.contains(nextTarget)) {
      scheduleCollapse();
    }
  };

  return (
    <aside
      ref={placeholderRef}
      style={{ '--sidebar-width': `${sidebarWidth}px`, willChange: 'width' } as CSSProperties}
      className={`order-2 z-20 hidden w-full min-w-0 border-t border-white/[.06] py-4 md:order-1 md:flex md:w-[var(--sidebar-width)] md:min-w-[var(--sidebar-width)] md:shrink-0 md:self-start md:border-t-0 md:py-0 md:transition-[width,min-width] md:ease-[cubic-bezier(0.16,1,0.3,1)] ${
        collapsed ? 'md:duration-[1180ms]' : 'md:duration-[680ms]'
      }`}
    >
      <div
        ref={panelRef}
        onMouseEnter={openRail}
        onMouseLeave={scheduleCollapse}
        onFocusCapture={openRail}
        onBlurCapture={handleBlurCapture}
        className={`flex w-full flex-col rounded-2xl border border-white/[0.07] bg-[rgba(12,12,18,0.92)] backdrop-blur-md md:fixed md:top-0 md:h-screen md:w-[var(--sidebar-width)] md:rounded-none md:border-y-0 md:border-l-0 md:border-r md:border-white/[.06] md:transition-[width,box-shadow] md:ease-[cubic-bezier(0.16,1,0.3,1)] ${
          collapsed
            ? 'md:duration-[1180ms] md:shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)]'
            : 'md:duration-[680ms]'
        }`}
        style={{ left: panelLeft, willChange: 'width' } as CSSProperties}
      >
        <div
          className={`flex h-[92px] shrink-0 items-center transition-[padding,gap] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            collapsed ? 'justify-center px-0 duration-[980ms]' : 'gap-3 px-5 md:px-6 duration-[620ms]'
          }`}
        >
          <Link
            href="/"
            className={`group inline-flex items-center no-underline transition-[gap] ease-[cubic-bezier(0.16,1,0.3,1)] ${
              collapsed ? 'justify-center gap-0 duration-[980ms]' : 'duration-[620ms]'
            }`}
            aria-label="Koku Dedektifi ana sayfa"
          >
            {collapsed ? (
              <LogoMark size={54} />
            ) : (
              <span className="overflow-hidden transition-[max-width,transform] duration-[720ms] ease-[cubic-bezier(0.16,1,0.3,1)]">
                <Logo size="sidebar" asLink={false} />
              </span>
            )}
          </Link>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-14 bg-[linear-gradient(180deg,rgba(12,12,18,0.98)_0%,rgba(12,12,18,0.84)_48%,rgba(12,12,18,0)_100%)] transition-opacity duration-300 ${
              scrollFade.top ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-[linear-gradient(0deg,rgba(12,12,18,0.98)_0%,rgba(12,12,18,0.85)_42%,rgba(12,12,18,0.32)_70%,rgba(12,12,18,0)_100%)] transition-opacity duration-300 ${
              scrollFade.bottom ? 'opacity-100' : 'opacity-0'
            }`}
          />

          <nav ref={navRef} className="scrollbar-none h-full overflow-y-auto py-4 pb-12" role="navigation" aria-label="Ana menü">
            {NAV.map((group, groupIndex) => (
              <div key={group.section} className={groupIndex === 0 ? '' : collapsed ? 'mt-4' : 'mt-0'}>
                <p
                  className={`overflow-hidden text-[10px] font-medium tracking-[0.2em] text-white/30 transition-[max-height,margin,padding] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    collapsed
                      ? 'mb-0 mt-0 max-h-0 px-0 duration-[520ms]'
                      : groupIndex === 0
                        ? 'mb-1 mt-0 max-h-6 px-4 duration-[620ms]'
                        : 'mb-1 mt-6 max-h-6 px-4 duration-[620ms]'
                  }`}
                >
                  {group.section}
                </p>

                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.Icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      aria-current={isActive ? 'page' : undefined}
                      className={`group relative flex items-center rounded-2xl transition-all ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        collapsed
                          ? 'mx-3 my-1.5 min-h-[54px] justify-center px-0 duration-[920ms]'
                          : 'mx-2 min-h-[48px] gap-3 px-4 py-3 duration-[460ms]'
                      } ${
                        isActive
                          ? collapsed
                            ? 'bg-amber-500/[0.07] text-amber-300 shadow-[0_0_12px_rgba(217,119,6,0.08)]'
                            : 'bg-amber-500/10 text-amber-400'
                          : collapsed
                            ? 'text-white/56 hover:bg-white/[0.04] hover:text-white/90'
                            : 'text-white/60 hover:bg-white/5 hover:text-white/90 active:bg-white/8'
                      }`}
                    >
                      <span
                        className={`flex items-center justify-center rounded-xl transition-all ${
                          collapsed ? 'duration-[920ms]' : 'duration-[460ms]'
                        } ${
                          collapsed
                            ? isActive
                              ? 'h-11 w-11 border border-amber-500/18 bg-amber-500/[0.07] text-amber-300'
                              : 'h-11 w-11 border border-white/[0.05] bg-white/[0.02] text-white/44 group-hover:border-white/[0.10] group-hover:bg-white/[0.04] group-hover:text-white/82'
                            : `h-4 w-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-white/40'}`
                        }`}
                      >
                        <Icon className={collapsed ? 'h-[18px] w-[18px]' : 'h-4 w-4'} strokeWidth={1.85} />
                      </span>

                      <span
                        className={`overflow-hidden whitespace-nowrap text-sm font-medium transition-[max-width,transform] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          collapsed
                            ? 'max-w-0 -translate-x-1 duration-[620ms] delay-[120ms]'
                            : 'max-w-[160px] translate-x-0 duration-[620ms] delay-[100ms]'
                        }`}
                      >
                        {item.label}
                      </span>

                      {isActive ? (
                        collapsed ? (
                          <div className="absolute right-[8px] top-1/2 h-4 w-px -translate-y-1/2 rounded-full bg-amber-400/82" />
                        ) : (
                          <div className="ml-auto h-4 w-1 rounded-full bg-amber-400" />
                        )
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        <div
          className={`shrink-0 border-t border-white/[.08] transition-[padding] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            collapsed ? 'px-3 pb-6 pt-4 duration-[980ms]' : 'px-4 pb-8 pt-4 duration-[620ms]'
          }`}
        >
          {collapsed ? (
            <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                title={isPro ? 'Pro aktif' : "Pro'yu aç"}
                onClick={() => {
                  if (!isPro) void activate();
                }}
                disabled={upgradeBusy || isPro}
                className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-3 text-[11px] font-semibold tracking-[0.18em] shadow-[0_0_18px_rgba(217,119,6,0.16)] transition-all duration-300 disabled:opacity-60 ${
                  isPro
                    ? 'border border-emerald-500/28 bg-emerald-500/12 text-emerald-300'
                    : 'border border-amber-500/25 bg-amber-500/[0.12] text-amber-300 hover:border-amber-400/35 hover:bg-amber-500/[0.16]'
                }`}
              >
                {upgradeBusy ? '...' : isPro ? 'PRO ✓' : 'PRO'}
              </button>

              <div className="h-11 w-[6px] overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="w-full rounded-full bg-gradient-to-b from-amber-400 to-amber-600 transition-all duration-500"
                  style={{ height: `${Math.max(14, usagePct)}%`, marginTop: `${100 - Math.max(14, usagePct)}%` }}
                />
              </div>

              <span className="text-[10px] font-medium tracking-wide text-white/34">
                {todayUsage}/{usageLabel}
              </span>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-[11px] tracking-wide text-white/40">Günlük analiz</span>
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

              <button
                type="button"
                onClick={() => {
                  if (!isPro) void activate();
                }}
                disabled={upgradeBusy || isPro}
                className={`block w-full rounded-xl py-3.5 text-center text-sm font-bold tracking-widest shadow-[0_4px_20px_rgba(217,119,6,0.35)] transition-transform active:scale-[0.98] disabled:opacity-60 ${
                  isPro
                    ? 'border border-emerald-500/25 bg-emerald-500/12 text-emerald-300'
                    : 'bg-gradient-to-r from-amber-600 to-amber-500 text-black'
                }`}
              >
                {upgradeBusy ? 'PRO AÇILIYOR...' : isPro ? 'PRO AKTİF ✓' : "PRO'YA GEÇ"}
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
