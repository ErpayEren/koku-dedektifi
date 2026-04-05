'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { useProGate } from '@/hooks/useProGate';
import { analyzeText, readableError } from '@/lib/client/api';
import { useToastSync } from '@/lib/client/useToastSync';
import { upsertWardrobeRemote } from '@/lib/client/wardrobe';
import { useUserStore } from '@/lib/store/userStore';
import type { AnalysisResult } from '@/lib/client/types';

function allNotes(result: AnalysisResult | null): string[] {
  if (!result?.pyramid) return [];
  return [...result.pyramid.top, ...result.pyramid.middle, ...result.pyramid.base];
}

function commonNotes(left: AnalysisResult | null, right: AnalysisResult | null): string[] {
  const rightSet = new Set(allNotes(right).map((item) => item.toLowerCase()));
  return allNotes(left).filter((item, index, list) => {
    const key = item.toLowerCase();
    return rightSet.has(key) && list.findIndex((entry) => entry.toLowerCase() === key) === index;
  });
}

function toWardrobeRow(result: AnalysisResult) {
  return {
    key: result.name.toLowerCase().replace(/\s+/g, '-'),
    name: result.name,
    brand: result.brand || '',
    family: result.family,
    status: 'owned' as const,
    favorite: false,
    rating: 0,
    notes: '',
    iconToken: result.iconToken,
    tags: [result.family, ...(result.season || [])].map((item) => item.toLowerCase()).slice(0, 8),
    updatedAt: new Date().toISOString(),
    analysis: result,
  };
}

export default function KarsilastirPage() {
  const { requirePro } = useProGate();
  const isPro = useUserStore((state) => state.isPro);
  const [left, setLeft] = useState('Dior Sauvage Eau de Parfum');
  const [right, setRight] = useState('Bleu de Chanel Eau de Parfum');
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [leftResult, setLeftResult] = useState<AnalysisResult | null>(null);
  const [rightResult, setRightResult] = useState<AnalysisResult | null>(null);

  useToastSync({ error, notice });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const query = new URLSearchParams(window.location.search);
    const leftQuery = query.get('left');
    const rightQuery = query.get('right');
    if (leftQuery) setLeft(leftQuery);
    if (rightQuery) setRight(rightQuery);
  }, []);

  const sharedNotes = useMemo(() => commonNotes(leftResult, rightResult), [leftResult, rightResult]);

  async function runCompare(): Promise<void> {
    if (!requirePro('Karşılaştır')) return;
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const [leftValue, rightValue] = await Promise.all([analyzeText(left, isPro), analyzeText(right, isPro)]);
      setLeftResult(leftValue);
      setRightResult(rightValue);
    } catch (errorValue) {
      setError(readableError(errorValue));
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(result: AnalysisResult): Promise<void> {
    setSavingKey(result.id);
    setNotice('');
    try {
      await upsertWardrobeRemote(toWardrobeRow(result));
      setNotice(`${result.name} dolaba eklendi.`);
    } catch (errorValue) {
      setError(readableError(errorValue));
    } finally {
      setSavingKey('');
    }
  }

  return (
    <AppShell>
      <ErrorBoundary>
        <TopBar title="Karşılaştır" />
        <div className="px-5 py-8 md:px-12">
          <Card className="mb-5 p-5 md:p-6 hover-lift">
            <CardTitle>Karşılaştır</CardTitle>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                value={left}
                onChange={(event) => setLeft(event.target.value)}
                className="w-full rounded-xl border border-white/[.08] bg-transparent p-3.5 text-[14px] text-cream outline-none focus:border-[var(--gold-line)]"
                placeholder="Birinci parfüm"
              />
              <input
                value={right}
                onChange={(event) => setRight(event.target.value)}
                className="w-full rounded-xl border border-white/[.08] bg-transparent p-3.5 text-[14px] text-cream outline-none focus:border-[var(--gold-line)]"
                placeholder="İkinci parfüm"
              />
            </div>
            <button
              type="button"
              onClick={() => void runCompare()}
              disabled={loading || !left.trim() || !right.trim()}
              className={`mt-4 rounded-lg px-5 py-2.5 text-[11px] font-mono uppercase tracking-[.1em] transition-colors ${
                loading || !left.trim() || !right.trim()
                  ? 'border border-white/[.08] bg-white/[.06] text-muted'
                  : 'bg-gold text-bg hover:bg-[#d8b676]'
              }`}
            >
              {loading ? 'Karşılaştırılıyor...' : 'Karşılaştırmayı başlat'}
            </button>
          </Card>

          <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <ResultCard title="Sol Sonuç" row={leftResult} saving={savingKey === leftResult?.id} onAdd={handleAdd} loading={loading} />
            <ResultCard title="Sağ Sonuç" row={rightResult} saving={savingKey === rightResult?.id} onAdd={handleAdd} loading={loading} />
          </div>

          {leftResult && rightResult ? (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_.8fr]">
              <Card className="p-5 md:p-6 hover-lift">
                <CardTitle>Yan yana tablo</CardTitle>
                <CompareTable left={leftResult} right={rightResult} />
              </Card>

              <Card className="p-5 md:p-6 hover-lift">
                <CardTitle>Ortak notalar</CardTitle>
                {sharedNotes.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {sharedNotes.map((note) => (
                      <span key={note} className="rounded-full border border-sage/30 bg-sage/10 px-3 py-1.5 text-[11px] text-sage">
                        {note}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-[13px] text-muted">Ortak nota izine rastlanmadı; karakterleri farklı eksenlerde ayrışıyor.</p>
                )}
              </Card>
            </div>
          ) : null}
        </div>
      </ErrorBoundary>
    </AppShell>
  );
}

function ResultCard({
  title,
  row,
  saving,
  onAdd,
  loading,
}: {
  title: string;
  row: AnalysisResult | null;
  saving: boolean;
  onAdd: (row: AnalysisResult) => Promise<void>;
  loading: boolean;
}) {
  if (loading && !row) {
    return <SkeletonCard lines={4} className="h-full" />;
  }

  return (
    <Card className="hover-lift p-5">
      <CardTitle>{title}</CardTitle>
      {!row ? (
        <p className="text-[12px] text-muted">Analiz bekleniyor.</p>
      ) : (
        <div>
          <p className="text-[1.8rem] font-semibold leading-[1.06] text-cream">{row.name}</p>
          <p className="mt-1 text-[11px] text-muted">
            {[row.brand, row.family, typeof row.year === 'number' ? String(row.year) : ''].filter(Boolean).join(' · ')}
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-cream/82">{row.moodProfile || row.description}</p>
          <button
            type="button"
            onClick={() => void onAdd(row)}
            className="mt-4 rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)]/15 px-3.5 py-2 text-[10px] font-mono uppercase tracking-[.08em] text-gold transition-colors hover:bg-[var(--gold-dim)]/35"
          >
            {saving ? 'Ekleniyor...' : 'Dolabıma Ekle'}
          </button>
        </div>
      )}
    </Card>
  );
}

function CompareTable({ left, right }: { left: AnalysisResult; right: AnalysisResult }) {
  const rows = [
    { label: 'Aile', left: left.family, right: right.family },
    { label: 'Üst notalar', left: left.pyramid?.top.join(', ') || '—', right: right.pyramid?.top.join(', ') || '—' },
    { label: 'Kalp notaları', left: left.pyramid?.middle.join(', ') || '—', right: right.pyramid?.middle.join(', ') || '—' },
    { label: 'Alt notalar', left: left.pyramid?.base.join(', ') || '—', right: right.pyramid?.base.join(', ') || '—' },
    { label: 'Sillage', left: left.sillage || '—', right: right.sillage || '—' },
    {
      label: 'Kalıcılık',
      left: left.longevityHours ? `${left.longevityHours.min}-${left.longevityHours.max} saat` : '—',
      right: right.longevityHours ? `${right.longevityHours.min}-${right.longevityHours.max} saat` : '—',
    },
    { label: 'Mevsim', left: (left.season || []).join(', ') || '—', right: (right.season || []).join(', ') || '—' },
    {
      label: 'Skorlar',
      left: `Değer ${left.scoreCards?.value ?? '—'} · Özgünlük ${left.scoreCards?.uniqueness ?? '—'} · Giyilebilirlik ${left.scoreCards?.wearability ?? '—'}`,
      right: `Değer ${right.scoreCards?.value ?? '—'} · Özgünlük ${right.scoreCards?.uniqueness ?? '—'} · Giyilebilirlik ${right.scoreCards?.wearability ?? '—'}`,
    },
  ];

  return (
    <div className="mt-4 divide-y divide-white/[.06]">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-1 gap-3 py-3 md:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)] md:items-start">
          <p className="text-[11px] font-mono uppercase tracking-[.12em] text-muted">{row.label}</p>
          <CompareValue left value={row.left} other={row.right} />
          <CompareValue value={row.right} other={row.left} />
        </div>
      ))}
    </div>
  );
}

function CompareValue({
  value,
  other,
  left = false,
}: {
  value: string;
  other: string;
  left?: boolean;
}) {
  const stronger = value.length > other.length;
  return (
    <p className={`text-[13px] leading-relaxed ${stronger ? 'font-semibold text-cream' : 'text-cream/82'}`}>
      {value}
      {left && value === other ? <span className="ml-2 text-sage">• Ortak</span> : null}
    </p>
  );
}
