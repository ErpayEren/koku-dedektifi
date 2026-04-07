'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { fetchAnalysisHistory } from '@/lib/client/api';
import { getHistory } from '@/lib/client/storage';
import { syncWardrobeFromRemote } from '@/lib/client/wardrobe';
import type { AnalysisResult, WardrobeItem } from '@/lib/client/types';

const PIE_COLORS = ['#d4b16b', '#4f79ff', '#9b7ff3', '#64c3a7', '#d58ebb'];

export function WearPageClient() {
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [remoteHistory, remoteWardrobe] = await Promise.all([
          fetchAnalysisHistory().catch(() => getHistory()),
          syncWardrobeFromRemote(),
        ]);
        setHistory(remoteHistory.length > 0 ? remoteHistory : getHistory());
        setWardrobe(remoteWardrobe);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const summary = useMemo(() => buildWearSummary(history, wardrobe), [history, wardrobe]);

  if (loading) {
    return (
      <AppShell>
        <TopBar title="Koku Rutinim" />
        <div className="grid grid-cols-1 gap-5 px-5 py-10 md:px-12 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-5">
            <SkeletonCard lines={4} />
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </div>
          <div className="space-y-5">
            <SkeletonCard lines={3} />
            <SkeletonCard lines={5} />
          </div>
        </div>
      </AppShell>
    );
  }

  if (history.length < 3) {
    return (
      <AppShell>
        <TopBar title="Koku Rutinim" />
        <div className="px-5 py-10 md:px-12">
          <Card className="mx-auto max-w-[760px] p-6 md:p-10">
            <EmptyState
              title="Henüz kayıt yok"
              subtitle="Analiz geçmişin arttıkça kişisel koku rutinin burada şekillenecek."
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
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopBar title="Koku Rutinim" />
      <div className="px-5 py-8 pb-24 md:px-12 md:pb-10">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-5">
            <Card className="p-5 md:p-6 hover-lift" glow="amber">
              <CardTitle>Aile dağılımı</CardTitle>
              <PieChart values={summary.familySlices} />
            </Card>

            <Card className="p-5 md:p-6 hover-lift">
              <CardTitle>En çok analiz edilen notalar</CardTitle>
              <div className="mt-4 flex flex-wrap gap-2">
                {summary.topNotes.map((note) => (
                  <span key={note} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-cream/85">
                    {note}
                  </span>
                ))}
              </div>
            </Card>

            <Card className="p-5 md:p-6 hover-lift">
              <CardTitle>Mevsimsel pattern</CardTitle>
              <p className="mt-3 text-[14px] leading-relaxed text-cream/82">{summary.seasonPattern}</p>
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="p-5 md:p-6 hover-lift">
              <CardTitle>Sahip olduğun koleksiyonun profili</CardTitle>
              <p className="mt-3 text-[14px] leading-relaxed text-cream/82">{summary.ownedProfile}</p>
            </Card>

            <Card className="p-5 md:p-6 hover-lift">
              <CardTitle>Son analiz zaman çizgisi</CardTitle>
              <div className="mt-4 space-y-3">
                {history.slice(0, 8).map((item) => (
                  <Link
                    key={item.id}
                    href={`/?replay=${encodeURIComponent(item.id)}`}
                    className="block rounded-[20px] border border-white/8 bg-white/[.03] p-4 transition-all duration-300 hover:border-[var(--gold-line)] hover:bg-white/[.05]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[1rem] font-semibold text-cream">{item.name}</p>
                        <p className="mt-1 text-[12px] text-muted">
                          {item.family} · {(item.season || []).join(', ') || 'Dört mevsim'}
                        </p>
                      </div>
                      <span className="text-[11px] text-muted">
                        {new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(item.createdAt))}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function buildWearSummary(history: AnalysisResult[], wardrobe: WardrobeItem[]) {
  const familyCounts = new Map<string, number>();
  const noteCounts = new Map<string, number>();
  const seasonCounts = new Map<string, number>();

  history.forEach((item) => {
    const familyKey = item.family || 'Diğer';
    familyCounts.set(familyKey, (familyCounts.get(familyKey) || 0) + 1);

    [...(item.pyramid?.top || []), ...(item.pyramid?.middle || []), ...(item.pyramid?.base || [])].forEach((note) => {
      noteCounts.set(note, (noteCounts.get(note) || 0) + 1);
    });

    (item.season || []).forEach((season) => {
      seasonCounts.set(season, (seasonCounts.get(season) || 0) + 1);
    });
  });

  const familySlices = Array.from(familyCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([label, value], index) => ({ label, value, color: PIE_COLORS[index % PIE_COLORS.length] }));

  const topNotes = Array.from(noteCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([note]) => note);

  const topSeason = Array.from(seasonCounts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] || 'Yıl boyu';
  const dominantFamily = familySlices[0]?.label || 'Aromatik';
  const secondaryFamily = familySlices[1]?.label || dominantFamily;

  const ownedItems = wardrobe.filter((item) => item.status === 'owned');
  const ownedProfile = ownedItems.length
    ? `Sahip olduğun koleksiyon ${ownedItems.length} parfüm üzerinden okununca ${Array.from(new Set(ownedItems.map((item) => item.family).filter(Boolean))).slice(0, 3).join(', ')} eksenine yaslanıyor.`
    : 'Dolabında “Sahibim” statüsünde yeterli parfüm yok; bu alan dolabın büyüdükçe derinleşecek.';

  return {
    familySlices,
    topNotes,
    seasonPattern: `${topSeason} döneminde daha çok ${dominantFamily.toLowerCase()} karakterine çekiliyorsun; ikinci baskın eğilim ${secondaryFamily.toLowerCase()} çizgisi.`,
    ownedProfile,
  };
}

function PieChart({ values }: { values: Array<{ label: string; value: number; color: string }> }) {
  const total = values.reduce((sum, item) => sum + item.value, 0) || 1;
  let angle = 0;

  return (
    <div className="mt-4 flex items-center gap-4">
      <svg viewBox="0 0 120 120" className="h-32 w-32 shrink-0">
        {values.map((item) => {
          const startAngle = angle;
          const sliceAngle = (item.value / total) * Math.PI * 2;
          angle += sliceAngle;
          const x1 = 60 + 42 * Math.cos(startAngle - Math.PI / 2);
          const y1 = 60 + 42 * Math.sin(startAngle - Math.PI / 2);
          const x2 = 60 + 42 * Math.cos(angle - Math.PI / 2);
          const y2 = 60 + 42 * Math.sin(angle - Math.PI / 2);
          const largeArc = sliceAngle > Math.PI ? 1 : 0;
          const d = `M 60 60 L ${x1} ${y1} A 42 42 0 ${largeArc} 1 ${x2} ${y2} Z`;
          return <path key={item.label} d={d} fill={item.color} fillOpacity="0.85" />;
        })}
        <circle cx="60" cy="60" r="22" fill="#0d0d12" />
      </svg>

      <div className="space-y-2">
        {values.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-[12px] text-cream/82">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
            <span>{item.label}</span>
            <span className="text-muted">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
