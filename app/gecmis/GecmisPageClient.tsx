'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { fetchAnalysisHistory } from '@/lib/client/api';
import { clearHistory, getHistory, saveHistoryRow } from '@/lib/client/storage';
import type { AnalysisResult } from '@/lib/client/types';

function familyBadgeClass(family: string): string {
  const val = family.toLowerCase();
  if (val.includes('odunsu')) return 'border-[#5fb6a0]/40 text-[#8ad7c3]';
  if (val.includes('oryantal')) return 'border-[#d5a579]/40 text-[#e6c39f]';
  if (val.includes('çiçek') || val.includes('cicek')) return 'border-[#cf8ac8]/40 text-[#e2ace0]';
  return 'border-white/[.09] text-muted';
}

export function GecmisPageClient() {
  const [rows, setRows] = useState<AnalysisResult[]>(() => getHistory());
  const [loading, setLoading] = useState(true);
  const hasRows = rows.length > 0;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const remote = await fetchAnalysisHistory();
        if (!cancelled && remote.length > 0) {
          remote.forEach((item) => saveHistoryRow(item));
          setRows(remote);
        }
      } catch {
        // Giriş yoksa veya DB okunamazsa yerel geçmişte kal.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, AnalysisResult[]>();
    rows.forEach((row) => {
      const date = new Date(row.createdAt).toLocaleDateString('tr-TR');
      const list = map.get(date) || [];
      list.push(row);
      map.set(date, list);
    });
    return Array.from(map.entries());
  }, [rows]);

  return (
    <AppShell>
      <TopBar title="Koku Geçmişi" />
      <div className="px-5 py-8 md:px-12">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              clearHistory();
              setRows([]);
            }}
            className="text-[11px] font-mono uppercase tracking-[.08em] text-muted transition-colors hover:text-cream"
          >
            Geçmişi Temizle
          </button>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SkeletonCard lines={4} />
            <SkeletonCard lines={4} />
            <SkeletonCard lines={4} />
          </div>
        ) : !hasRows ? (
          <Card className="p-4">
            <EmptyState
              title="Henüz geçmiş yok"
              subtitle="İlk analizi yaptığında sonuçlar burada birikir."
              action={
                <Link
                  href="/"
                  className="inline-flex items-center rounded-md border border-[var(--gold-line)] bg-[var(--gold-dim)] px-5 py-3 text-[11px] font-mono uppercase tracking-[.08em] text-gold no-underline transition-colors hover:bg-gold/15"
                >
                  İlk Analizi Yap
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="space-y-6">
            {grouped.map(([date, list]) => (
              <section key={date}>
                <p className="mb-3 text-[11px] font-mono uppercase tracking-[.12em] text-muted">{date}</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {list.map((item) => (
                    <Link
                      key={item.id}
                      onClick={() => saveHistoryRow(item)}
                      href={`/?replay=${encodeURIComponent(item.id)}&mode=${encodeURIComponent(
                        item.analysisMode === 'image' ? 'photo' : item.analysisMode || 'text',
                      )}`}
                      className="no-underline"
                    >
                      <Card className="h-full p-4 transition-colors hover-lift hover:border-[var(--gold-line)]">
                        <p className="text-[1.5rem] font-semibold leading-[1.08] text-cream">{item.name}</p>
                        <p className="mt-1 text-[11px] text-muted">
                          {[item.brand, typeof item.year === 'number' ? String(item.year) : '', item.family].filter(Boolean).join(' · ')}
                        </p>
                        <p className="mt-2 text-[11px] text-muted">{(item.moodProfile || item.description).slice(0, 92)}...</p>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <span className={`rounded-full border px-2 py-1 text-[10px] ${familyBadgeClass(item.family)}`}>{item.family}</span>
                          <span className="text-[10px] text-muted">{item.intensity}%</span>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
