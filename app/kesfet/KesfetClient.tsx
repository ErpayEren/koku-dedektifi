'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { searchPerfumes, getTrendingPerfumes, readableError } from '@/lib/client/api';
import type { PerfumeSearchResult } from '@/lib/client/api';
import { useUserStore } from '@/lib/store/userStore';

const GENDERS = ['Feminen', 'Maskülen', 'Unisex'];
const PRICE_TIERS = ['budget', 'mid', 'premium', 'luxury'];
const PRICE_TIER_LABELS: Record<string, string> = {
  budget: 'Uygun',
  mid: 'Orta',
  premium: 'Premium',
  luxury: 'Lüks',
};

function PerfumeCard({
  perfume,
  onAnalyze,
}: {
  perfume: PerfumeSearchResult;
  onAnalyze: (name: string) => void;
}) {
  const displayName = perfume.brand ? `${perfume.brand} ${perfume.name}` : perfume.name;
  const topNotes = (perfume.top_notes ?? []).slice(0, 3);

  return (
    <div className="group relative flex flex-col gap-3 rounded-[20px] border border-white/[.08] bg-[var(--bg-card)] p-4 transition-all hover:border-[var(--gold-line)] hover:shadow-[0_0_20px_var(--gold-dim)]">
      {/* Cover / placeholder */}
      <div className="aspect-square w-full overflow-hidden rounded-2xl bg-white/[.04]">
        {perfume.cover_image_url ? (
          <Image
            src={perfume.cover_image_url}
            alt={displayName}
            width={200}
            height={200}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[28px] opacity-40">🧴</div>
        )}
      </div>

      <div className="flex-1">
        <p className="text-[10px] font-mono uppercase tracking-[.1em] text-gold/70">{perfume.brand || '—'}</p>
        <h3 className="mt-1 line-clamp-2 text-[14px] font-semibold leading-snug text-cream">{perfume.name}</h3>
        {topNotes.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {topNotes.map((note) => (
              <span
                key={note}
                className="rounded-full border border-white/[.07] px-2 py-0.5 text-[9px] font-mono text-muted"
              >
                {note}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-2 flex items-center gap-2">
          {perfume.gender ? (
            <span className="text-[9px] font-mono uppercase tracking-[.08em] text-muted">{perfume.gender}</span>
          ) : null}
          {perfume.price_tier ? (
            <span className="text-[9px] font-mono uppercase tracking-[.08em] text-gold/60">
              {PRICE_TIER_LABELS[perfume.price_tier] ?? perfume.price_tier}
            </span>
          ) : null}
          {typeof perfume.analysis_count_7d === 'number' && perfume.analysis_count_7d > 0 ? (
            <span className="ml-auto text-[9px] font-mono text-sage/70">
              {perfume.analysis_count_7d} analiz
            </span>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onAnalyze(displayName)}
        className="w-full rounded-xl border border-[var(--gold-line)] bg-[var(--gold-dim)]/15 py-2.5 text-[10px] font-mono uppercase tracking-[.1em] text-gold transition-colors hover:bg-[var(--gold-dim)]/30 active:scale-[.98]"
        aria-label={`${displayName} analiz et`}
      >
        Analiz Et
      </button>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[10px] font-mono uppercase tracking-[.1em] transition-colors ${
        active
          ? 'border border-[var(--gold-line)] bg-[var(--gold-dim)]/25 text-gold'
          : 'border border-white/[.08] bg-white/[.03] text-muted hover:border-[var(--gold-line)] hover:text-cream'
      }`}
    >
      {label}
    </button>
  );
}

export function KesfetClient() {
  const router = useRouter();
  const isPro = useUserStore((s) => s.isPro);

  const [tab, setTab] = useState<'search' | 'trending' | 'foryou'>('trending');
  const [query, setQuery] = useState('');
  const [gender, setGender] = useState('');
  const [priceTier, setPriceTier] = useState('');
  const [page, setPage] = useState(1);

  const [results, setResults] = useState<PerfumeSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [trending, setTrending] = useState<PerfumeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(
    async (q: string, g: string, pt: string, pg: number) => {
      setLoading(true);
      setError('');
      try {
        const data = await searchPerfumes({ q: q || undefined, gender: g || undefined, price_tier: pt || undefined, page: pg });
        if (pg === 1) {
          setResults(data.results);
        } else {
          setResults((prev) => [...prev, ...data.results]);
        }
        setTotal(data.total);
      } catch (err) {
        setError(readableError(err));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const doTrending = useCallback(async () => {
    if (trending.length > 0) return;
    setLoading(true);
    setError('');
    try {
      const data = await getTrendingPerfumes();
      setTrending(data);
    } catch (err) {
      setError(readableError(err));
    } finally {
      setLoading(false);
    }
  }, [trending.length]);

  // Load trending on mount
  useEffect(() => {
    void doTrending();
  }, [doTrending]);

  // Debounced search when query/filters change
  useEffect(() => {
    if (tab !== 'search') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      void doSearch(query, gender, priceTier, 1);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, gender, priceTier, tab, doSearch]);

  // Switch to search tab when user types
  function handleQueryChange(value: string) {
    setQuery(value);
    if (tab !== 'search') setTab('search');
  }

  function handleAnalyze(name: string) {
    router.push(`/?q=${encodeURIComponent(name)}`);
  }

  function loadMore() {
    const next = page + 1;
    setPage(next);
    void doSearch(query, gender, priceTier, next);
  }

  const displayList: PerfumeSearchResult[] =
    tab === 'trending'
      ? trending
      : tab === 'foryou'
        ? trending.filter((p) => {
            // Unisex always shown; pro users see all
            if (isPro) return true;
            return !p.gender || p.gender === 'Unisex';
          })
        : results;

  const hasMore = tab === 'search' && results.length < total && results.length > 0;

  return (
    <AppShell>
      <ErrorBoundary>
        <TopBar title="Keşfet" />

        <div className="px-4 pb-24 pt-6 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[1200px] space-y-6">

            {/* Search bar */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
                  <circle cx="7" cy="7" r="5" />
                  <path d="M11 11l3 3" />
                </svg>
              </div>
              <input
                type="search"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Parfüm veya marka ara..."
                className="w-full rounded-2xl border border-white/[.09] bg-[var(--bg-card)] py-3.5 pl-10 pr-4 text-[14px] text-cream outline-none placeholder:text-muted focus:border-[var(--gold-line)] focus:ring-0"
                aria-label="Parfüm ara"
              />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(['trending', 'foryou', 'search'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTab(t);
                    if (t === 'search' && results.length === 0) void doSearch(query, gender, priceTier, 1);
                  }}
                  className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-mono uppercase tracking-[.1em] transition-colors ${
                    tab === t
                      ? 'bg-gold text-bg'
                      : 'border border-white/[.08] text-muted hover:border-[var(--gold-line)] hover:text-cream'
                  }`}
                >
                  {t === 'trending' ? 'Trend' : t === 'foryou' ? 'Sen İçin' : 'Arama'}
                </button>
              ))}
            </div>

            {/* Filters (only in search tab) */}
            {tab === 'search' ? (
              <div className="flex flex-wrap gap-2">
                <span className="self-center text-[10px] font-mono uppercase tracking-[.1em] text-muted">Filtre:</span>
                {GENDERS.map((g) => (
                  <FilterChip
                    key={g}
                    label={g}
                    active={gender === g}
                    onClick={() => setGender((prev) => (prev === g ? '' : g))}
                  />
                ))}
                {PRICE_TIERS.map((pt) => (
                  <FilterChip
                    key={pt}
                    label={PRICE_TIER_LABELS[pt] ?? pt}
                    active={priceTier === pt}
                    onClick={() => setPriceTier((prev) => (prev === pt ? '' : pt))}
                  />
                ))}
                {(gender || priceTier) ? (
                  <button
                    type="button"
                    onClick={() => { setGender(''); setPriceTier(''); }}
                    className="rounded-full border border-white/[.08] px-3 py-1.5 text-[10px] font-mono text-muted transition-colors hover:text-cream"
                  >
                    Temizle
                  </button>
                ) : null}
              </div>
            ) : null}

            {/* Section header */}
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-mono uppercase tracking-[.12em] text-muted">
                {tab === 'trending'
                  ? `Bu Haftanın Trendi (${trending.length})`
                  : tab === 'foryou'
                    ? 'Sana Uygun Kokular'
                    : total > 0
                      ? `${total} sonuç`
                      : query
                        ? 'Arama Sonuçları'
                        : 'Tüm Parfümler'}
              </h2>
            </div>

            {/* Error */}
            {error ? (
              <Card className="p-4">
                <p className="text-[13px] text-red-400">{error}</p>
              </Card>
            ) : null}

            {/* Loading skeleton */}
            {loading && displayList.length === 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <SkeletonCard key={i} lines={3} />
                ))}
              </div>
            ) : null}

            {/* Empty state */}
            {!loading && displayList.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-[32px]">🔍</p>
                <p className="mt-3 text-[14px] text-cream/80">
                  {tab === 'search' && query
                    ? `"${query}" için sonuç bulunamadı.`
                    : tab === 'trending'
                      ? 'Trend verisi henüz yok. Biraz sonra tekrar bak.'
                      : 'Henüz içerik yok.'}
                </p>
                {tab === 'search' ? (
                  <p className="mt-2 text-[12px] text-muted">Farklı bir isim veya marka dene.</p>
                ) : null}
              </Card>
            ) : null}

            {/* Perfume grid */}
            {displayList.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {displayList.map((perfume) => (
                  <PerfumeCard key={perfume.id} perfume={perfume} onAnalyze={handleAnalyze} />
                ))}
              </div>
            ) : null}

            {/* Load more */}
            {hasMore ? (
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loading}
                  className="rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)]/15 px-6 py-3 text-[11px] font-mono uppercase tracking-[.1em] text-gold transition-colors hover:bg-[var(--gold-dim)]/30 disabled:opacity-50"
                >
                  {loading ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
                </button>
              </div>
            ) : null}

          </div>
        </div>
      </ErrorBoundary>
    </AppShell>
  );
}
