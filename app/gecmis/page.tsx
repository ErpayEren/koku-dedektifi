'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { clearHistory, getHistory } from '@/lib/client/storage';
import type { AnalysisResult } from '@/lib/client/types';
import { UI } from '@/lib/strings';

function familyBadgeClass(family: string): string {
  const val = family.toLowerCase();
  if (val.includes('odunsu')) return 'border-[#5fb6a0]/40 text-[#8ad7c3]';
  if (val.includes('oryantal')) return 'border-[#d5a579]/40 text-[#e6c39f]';
  if (val.includes('çiçek')) return 'border-[#cf8ac8]/40 text-[#e2ace0]';
  return 'border-white/[.09] text-muted';
}

export default function GecmisPage() {
  const [rows, setRows] = useState<AnalysisResult[]>(() => getHistory());
  const hasRows = rows.length > 0;

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
      <TopBar title={UI.history} />
      <div className="px-5 md:px-12 py-8">
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={() => {
              clearHistory();
              setRows([]);
            }}
            className="text-[11px] font-mono uppercase tracking-[.08em] text-muted hover:text-cream transition-colors"
          >
            {UI.clearHistory}
          </button>
        </div>
        {!hasRows ? (
          <Card className="p-4">
            <EmptyState title="Henüz geçmiş yok" body="İlk analizi yaptığında sonuçlar burada birikir." />
          </Card>
        ) : (
          <div className="space-y-6">
            {grouped.map(([date, list]) => (
              <section key={date}>
                <p className="text-[11px] font-mono tracking-[.12em] uppercase text-muted mb-3">{date}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {list.map((item) => (
                    <Link key={item.id} href={`/?replay=${encodeURIComponent(item.id)}&mode=text`} className="no-underline">
                      <Card className="p-4 h-full hover-lift hover:border-[var(--gold-line)] transition-colors">
                        <p className="font-display italic text-[1.5rem] leading-[1.08] text-cream">{item.name}</p>
                        <p className="text-[11px] text-muted mt-1">{item.description.slice(0, 92)}…</p>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <span className={`text-[10px] px-2 py-1 rounded-full border ${familyBadgeClass(item.family)}`}>{item.family}</span>
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

