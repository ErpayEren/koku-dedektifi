'use client';

import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { EmptyState } from '@/components/ui/EmptyState';
import { getWardrobe, removeWardrobe, setWardrobe } from '@/lib/client/storage';
import type { WardrobeItem } from '@/lib/client/types';
import { UI } from '@/lib/strings';

type StatusFilter = 'all' | WardrobeItem['status'];

function statusLabel(value: WardrobeItem['status']): string {
  if (value === 'owned') return 'Sahip';
  if (value === 'wishlist') return 'Wishlist';
  if (value === 'tested') return 'Denendi';
  if (value === 'rebuy') return 'Tekrar Alırım';
  return 'Geç';
}

export default function DolapPage() {
  const [items, setItems] = useState<WardrobeItem[]>(() => getWardrobe());
  const [filter, setFilter] = useState<StatusFilter>('all');

  const rows = useMemo(() => (filter === 'all' ? items : items.filter((item) => item.status === filter)), [filter, items]);

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
      <TopBar title={UI.wardrobe} />
      <div className="px-5 md:px-12 py-8">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex flex-wrap gap-2">
            {(['all', 'owned', 'wishlist', 'tested', 'rebuy', 'skip'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-[.08em] border transition-colors
                ${filter === status ? 'border-[var(--gold-line)] text-gold bg-[var(--gold-dim)]' : 'border-white/[.08] text-muted hover:text-cream'}`}
              >
                {status === 'all' ? 'Tümü' : statusLabel(status as WardrobeItem['status'])}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-muted">{rows.length} parfüm</span>
        </div>

        {rows.length === 0 ? (
          <Card className="p-4">
            <EmptyState title={UI.emptyWardrobe} body={UI.emptyWardrobeSub} />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rows.map((item) => (
              <Card key={item.key} className="p-4 hover-lift">
                <CardTitle>{item.family || 'Koku Profili'}</CardTitle>
                <p className="font-display italic text-[1.6rem] text-cream leading-[1.08]">{item.name}</p>
                <p className="text-[11px] text-muted mt-1">
                  {statusLabel(item.status)} • {new Date(item.updatedAt).toLocaleDateString('tr-TR')}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {item.tags.map((tag) => (
                    <span key={`${item.key}-${tag}`} className="text-[10px] px-2 py-1 rounded-full border border-white/[.08] text-muted">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-white/[.06] flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleFavorite(item.key)}
                    className={`text-[11px] px-3 py-2 rounded-lg border transition-colors
                    ${item.favorite ? 'border-[var(--gold-line)] text-gold bg-[var(--gold-dim)]' : 'border-white/[.08] text-muted hover:text-cream'}`}
                  >
                    {item.favorite ? 'Favori' : 'Favoriye Al'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.key)}
                    className="text-[11px] px-3 py-2 rounded-lg border border-white/[.08] text-muted hover:text-cream transition-colors"
                  >
                    Kaldır
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

