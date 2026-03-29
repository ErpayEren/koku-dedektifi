'use client';

import { useMemo } from 'react';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
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

  return (
    <AppShell>
      <TopBar title={UI.wearTracker} />
      <div className="px-5 md:px-12 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="p-5 md:p-6 hover-lift">
            <CardTitle>Genel Özet</CardTitle>
            <p className="font-display italic text-[2rem] text-cream leading-[1.06]">{summary.total}</p>
            <p className="text-[12px] text-muted mt-1">Toplam analiz kaydı</p>
            <p className="text-[12px] text-muted mt-3">
              Bu ekran geçmiş analizlerinden otomatik trend üretir. Veri arttıkça öneriler daha kişisel hale gelir.
            </p>
          </Card>

          <Card className="p-5 md:p-6 hover-lift">
            <CardTitle>Aile Dağılımı</CardTitle>
            {summary.topFamilies.length === 0 ? (
              <p className="text-[12px] text-muted">{UI.wearTrackerSub}</p>
            ) : (
              <div className="space-y-3">
                {summary.topFamilies.map(([family, count]) => (
                  <div key={family}>
                    <div className="flex justify-between text-[12px] mb-1.5">
                      <span className="text-cream">{family}</span>
                      <span className="text-muted">{count}</span>
                    </div>
                    <div className="h-[6px] bg-white/[.08] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, Math.min(100, (count / summary.total) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

