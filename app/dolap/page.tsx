'use client';

import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useProGate } from '@/hooks/useProGate';
import { getWardrobe, removeWardrobe, setWardrobe } from '@/lib/client/storage';
import { useUserStore } from '@/lib/store/userStore';
import type { WardrobeItem } from '@/lib/client/types';
import { UI } from '@/lib/strings';

type StatusFilter = 'all' | WardrobeItem['status'];

function statusLabel(value: WardrobeItem['status']): string {
  if (value === 'owned') return UI.wardrobeOwned;
  if (value === 'wishlist') return UI.wardrobeWishlist;
  if (value === 'tested') return UI.wardrobeTried;
  if (value === 'rebuy') return UI.wardrobeBuyAgain;
  return UI.wardrobeSkip;
}

export default function DolapPage() {
  const { requirePro } = useProGate();
  const { isPro, wardrobeLimit } = useUserStore((state) => ({
    isPro: state.isPro,
    wardrobeLimit: state.wardrobeLimit,
  }));
  const [items, setItems] = useState<WardrobeItem[]>(() => getWardrobe());
  const [filter, setFilter] = useState<StatusFilter>('all');

  const rows = useMemo(
    () => (filter === 'all' ? items : items.filter((item) => item.status === filter)),
    [filter, items],
  );

  function toggleFavorite(key: string): void {
    const next = items.map((item) => (item.key === key ? { ...item, favorite: !item.favorite } : item));
    setItems(next);
    setWardrobe(next);
  }

  function removeItem(key: string): void {
    removeWardrobe(key);
    setItems(getWardrobe());
  }

  return (
    <AppShell>
      <ErrorBoundary>
        <TopBar title={UI.wardrobe} />
        <div className="px-5 py-8 md:px-12">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {(['all', 'owned', 'wishlist', 'tested', 'rebuy', 'skip'] as StatusFilter[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilter(status)}
                  className={`rounded-full border px-3 py-1.5 text-[10px] font-mono uppercase tracking-[.08em] transition-colors ${
                    filter === status
                      ? 'border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold'
                      : 'border-white/[.08] text-muted hover:text-cream'
                  }`}
                >
                  {status === 'all' ? UI.wardrobeAll : statusLabel(status as WardrobeItem['status'])}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {!isPro && wardrobeLimit !== Number.POSITIVE_INFINITY ? (
                <button
                  type="button"
                  onClick={() => requirePro('Sınırsız dolap')}
                  className="rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)] px-3 py-1.5 text-[10px] font-mono uppercase tracking-[.08em] text-gold transition-colors hover:bg-[var(--gold-dim)]/80"
                >
                  {items.length}/{wardrobeLimit} dolu
                </button>
              ) : null}
              <span className="text-[11px] text-muted">{rows.length} parfüm</span>
            </div>
          </div>

          {rows.length === 0 ? (
            <Card className="p-4">
              <EmptyState title={UI.emptyWardrobe} subtitle={UI.emptyWardrobeSub} />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((item) => (
                <Card key={item.key} className="hover-lift p-4">
                  <p className="text-[10px] font-mono uppercase tracking-[.12em] text-muted">
                    {item.family || 'Koku Profili'}
                  </p>
                  <p className="mt-3 text-[1.6rem] font-semibold leading-[1.08] text-cream">{item.name}</p>
                  <p className="mt-1 text-[11px] text-muted">
                    {statusLabel(item.status)} · {new Date(item.updatedAt).toLocaleDateString('tr-TR')}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={`${item.key}-${tag}`}
                        className="rounded-full border border-white/[.08] px-2 py-1 text-[10px] text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2 border-t border-white/[.06] pt-3">
                    <button
                      type="button"
                      onClick={() => toggleFavorite(item.key)}
                      className={`rounded-lg border px-3 py-2 text-[11px] transition-colors ${
                        item.favorite
                          ? 'border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold'
                          : 'border-white/[.08] text-muted hover:text-cream'
                      }`}
                    >
                      {item.favorite ? 'Favori' : 'Favoriye ekle'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      className="rounded-lg border border-white/[.08] px-3 py-2 text-[11px] text-muted transition-colors hover:text-cream"
                    >
                      Kaldır
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ErrorBoundary>
    </AppShell>
  );
}
