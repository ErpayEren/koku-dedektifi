'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { EmptyState } from '@/components/ui/EmptyState';
import { getHistory } from '@/lib/client/storage';
import { UI } from '@/lib/strings';

export default function WearPage() {
  const history = useMemo(() => getHistory(), []);

  const summary = useMemo(() => {
    const familyCounter = new Map<string, number>();
    history.forEach((item) => {
      const key = item.family || 'Diğer';
      familyCounter.set(key, (familyCounter.get(key) || 0) + 1);
    });
    const topFamilies = Array.from(familyCounter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return { total: history.length, topFamilies };
  }, [history]);

  if (summary.total === 0) {
    return (
      <AppShell>
        <TopBar title={UI.pageWear} />
        <div className="px-5 py-10 md:px-12">
          <Card className="mx-auto max-w-[760px] p-6 md:p-10">
            <EmptyState
              icon={<div className="h-3.5 w-3.5 rounded-full bg-gold/35" />}
              title={UI.wearEmptyTitle}
              subtitle={UI.wearEmptyBody}
              action={
                <Link
                  href="/"
                  className="inline-flex items-center rounded-md border border-[var(--gold-line)] bg-[var(--gold-dim)] px-5 py-3 text-[11px] font-mono uppercase tracking-[.08em] text-gold no-underline transition-colors hover:bg-gold/15"
                >
                  {UI.emptyWardrobeBtn}
                </Link>
              }
            />
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopBar title={UI.pageWear} />
      <div className="px-5 py-8 md:px-12">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card className="p-5 md:p-6 hover-lift">
            <CardTitle>{UI.wearSummaryTitle}</CardTitle>
            <p className="font-display text-[2rem] italic leading-[1.06] text-cream">{summary.total}</p>
            <p className="mt-1 text-[12px] text-muted">{UI.wearAnalysisCount}</p>
            <p className="mt-3 text-[12px] text-muted">{UI.wearNoDataNote}</p>
          </Card>

          <Card className="p-5 md:p-6 hover-lift">
            <CardTitle>{UI.wearFamilyDist}</CardTitle>
            <div className="space-y-3">
              {summary.topFamilies.map(([family, count]) => (
                <div key={family}>
                  <div className="mb-1.5 flex justify-between text-[12px]">
                    <span className="text-cream">{family}</span>
                    <span className="text-muted">{count}</span>
                  </div>
                  <div className="h-[6px] overflow-hidden rounded-full bg-white/[.08]">
                    <div
                      className="h-full rounded-full bg-gold transition-all duration-500"
                      style={{ width: `${Math.max(5, Math.min(100, (count / summary.total) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
