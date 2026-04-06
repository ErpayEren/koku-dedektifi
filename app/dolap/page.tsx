'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { useProGate } from '@/hooks/useProGate';
import { useToastSync } from '@/lib/client/useToastSync';
import { syncWardrobeFromRemote, pushWardrobeToRemote } from '@/lib/client/wardrobe';
import { useUserStore } from '@/lib/store/userStore';
import type { WardrobeItem } from '@/lib/client/types';

type StatusFilter = 'all' | WardrobeItem['status'];

function statusLabel(value: WardrobeItem['status']): string {
  if (value === 'owned') return 'Sahibim';
  if (value === 'wishlist') return 'Wishlist';
  if (value === 'tested') return 'Denedim';
  if (value === 'rebuy') return 'Tekrar Alırım';
  return 'Geçti';
}

export default function DolapPage() {
  const router = useRouter();
  const { requirePro } = useProGate();
  const isPro = useUserStore((state) => state.isPro);
  const wardrobeLimit = useUserStore((state) => state.wardrobeLimit);
  const setWardrobeCount = useUserStore((state) => state.setWardrobeCount);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useToastSync({ error });

  useEffect(() => {
    void (async () => {
      try {
        const rows = await syncWardrobeFromRemote();
        setItems(rows);
        setWardrobeCount(rows.length);
      } catch {
        setError('Dolap yüklenirken bir sorun oluştu.');
      } finally {
        setLoading(false);
      }
    })();
  }, [setWardrobeCount]);

  const rows = useMemo(
    () => (filter === 'all' ? items : items.filter((item) => item.status === filter)),
    [filter, items],
  );

  async function updateRows(nextRows: WardrobeItem[], focusKey?: string): Promise<void> {
    setItems(nextRows);
    setWardrobeCount(nextRows.length);
    setSavingKey(focusKey || '');
    setError('');
    try {
      await pushWardrobeToRemote(nextRows);
    } catch {
      setError('Dolap değişiklikleri yerelde kaydedildi, sunucu senkronu biraz gecikti.');
    } finally {
      setSavingKey('');
    }
  }

  function changeItem(key: string, patch: Partial<WardrobeItem>) {
    const nextRows = items.map((item) => (item.key === key ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item));
    void updateRows(nextRows, key);
  }

  function removeItem(key: string): void {
    const nextRows = items.filter((item) => item.key !== key);
    void updateRows(nextRows, key);
  }

  return (
    <AppShell>
      <ErrorBoundary>
        <TopBar title="Koku Dolabım" />
        <div className="px-5 py-8 md:px-12">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
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
                  {status === 'all' ? 'Tümü' : statusLabel(status as WardrobeItem['status'])}
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

          {error ? <p className="mb-4 text-[12px] text-[#f1a2a2]">{error}</p> : null}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SkeletonCard lines={4} />
              <SkeletonCard lines={4} />
            </div>
          ) : rows.length === 0 ? (
            <Card className="p-4">
              <EmptyState
                title="Dolabın henüz boş"
                subtitle="Analiz ettiğin parfümleri buraya eklediğinde koleksiyonun zamanla burada şekillenecek."
                action={
                  <Link
                    href="/"
                    className="inline-flex items-center rounded-md border border-[var(--gold-line)] bg-[var(--gold-dim)] px-5 py-3 text-[11px] font-mono uppercase tracking-[.08em] text-gold no-underline transition-colors hover:bg-gold/15"
                  >
                    Analiz Et →
                  </Link>
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {rows.map((item) => (
                <Card key={item.key} className="hover-lift p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono uppercase tracking-[.12em] text-muted">{item.family || 'Koku profili'}</p>
                      <p className="mt-2 text-[1.45rem] font-semibold leading-[1.08] text-cream">{item.name}</p>
                      {item.brand ? <p className="mt-1 text-[12px] text-muted">{item.brand}</p> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => changeItem(item.key, { favorite: !item.favorite })}
                      className={`rounded-full border px-3 py-1.5 text-[10px] font-mono uppercase tracking-[.08em] ${
                        item.favorite ? 'border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold' : 'border-white/[.08] text-muted'
                      }`}
                    >
                      {item.favorite ? 'Favori' : 'Favorile'}
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-[.12em] text-muted">Kategori</label>
                      <select
                        value={item.status}
                        onChange={(event) => changeItem(item.key, { status: event.target.value as WardrobeItem['status'] })}
                        className="w-full rounded-xl border border-white/[.08] bg-[#15131a] p-3 text-sm text-cream outline-none focus:border-[var(--gold-line)]"
                      >
                        <option value="owned">Sahibim</option>
                        <option value="wishlist">Wishlist</option>
                        <option value="tested">Denedim</option>
                        <option value="rebuy">Tekrar Alırım</option>
                        <option value="skip">Geçti</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-[.12em] text-muted">Puan</label>
                      <div className="flex items-center gap-1 rounded-xl border border-white/[.08] bg-[#15131a] px-3 py-3">
                        {Array.from({ length: 5 }).map((_, index) => {
                          const filled = (item.rating || 0) >= index + 1;
                          return (
                            <button
                              key={`${item.key}-star-${index}`}
                              type="button"
                              onClick={() => changeItem(item.key, { rating: index + 1 })}
                              className={`text-lg leading-none ${filled ? 'text-gold' : 'text-white/18'}`}
                            >
                              ★
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-[.12em] text-muted">Notlar</label>
                    <textarea
                      value={item.notes || ''}
                      onChange={(event) => changeItem(item.key, { notes: event.target.value })}
                      rows={3}
                      className="w-full rounded-xl border border-white/[.08] bg-transparent p-3 text-sm text-cream outline-none focus:border-[var(--gold-line)]"
                      placeholder="Kalıcılık, imza hissi, tekrar alma notları..."
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[.06] pt-3">
                    <button
                      type="button"
                      onClick={() => router.push(`/?mode=text&q=${encodeURIComponent(item.brand ? `${item.brand} ${item.name}` : item.name)}`)}
                      className="rounded-lg border border-[var(--gold-line)] bg-[var(--gold-dim)]/15 px-3 py-2 text-[11px] text-gold transition-colors hover:bg-[var(--gold-dim)]/35"
                    >
                      Analiz Et
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      disabled={savingKey === item.key}
                      className="rounded-lg border border-white/[.08] px-3 py-2 text-[11px] text-muted transition-colors hover:text-cream"
                    >
                      {savingKey === item.key ? 'Kaydediliyor...' : 'Kaldır'}
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
