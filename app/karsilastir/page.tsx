'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { useProGate } from '@/hooks/useProGate';
import { analyzeText, readableError } from '@/lib/client/api';
import type { AnalysisResult } from '@/lib/client/types';
import { useUserStore } from '@/lib/store/userStore';
import { UI } from '@/lib/strings';

function ScoreRow({ label, left, right }: { label: string; left: number; right: number }) {
  const winner = left === right ? 'equal' : left > right ? 'left' : 'right';

  return (
    <div className="grid grid-cols-[110px_1fr_1fr] items-center gap-3 border-b border-white/[.06] py-2 text-[12px]">
      <span className="text-muted">{label}</span>
      <span className={winner === 'left' ? 'text-sage' : 'text-cream'}>{left}</span>
      <span className={winner === 'right' ? 'text-sage' : 'text-cream'}>{right}</span>
    </div>
  );
}

function ResultSide({ title, row }: { title: string; row: AnalysisResult | null }) {
  return (
    <Card className="hover-lift p-5">
      <CardTitle>{title}</CardTitle>
      {!row ? (
        <p className="text-[12px] text-muted">Analiz bekleniyor.</p>
      ) : (
        <div className="anim-up">
          <p className="text-[1.8rem] font-semibold leading-[1.06] text-cream">{row.name}</p>
          <p className="mt-1 text-[11px] text-muted">{row.family}</p>
          <p className="mt-3 text-[12px] text-muted">{row.description.slice(0, 130)}...</p>
        </div>
      )}
    </Card>
  );
}

export default function KarsilastirPage() {
  const { requirePro } = useProGate();
  const isPro = useUserStore((state) => state.isPro);
  const [left, setLeft] = useState('Dior Sauvage Eau de Parfum');
  const [right, setRight] = useState('Bleu de Chanel Eau de Parfum');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [leftResult, setLeftResult] = useState<AnalysisResult | null>(null);
  const [rightResult, setRightResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const query = new URLSearchParams(window.location.search);
    const leftQuery = query.get('left');
    const rightQuery = query.get('right');
    if (leftQuery) setLeft(leftQuery);
    if (rightQuery) setRight(rightQuery);
  }, []);

  async function runCompare(): Promise<void> {
    if (!requirePro('Karşılaştırma analizi')) return;
    setLoading(true);
    setError('');

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

  return (
    <AppShell>
      <ErrorBoundary>
        <TopBar title={UI.compare} />
        <div className="px-5 py-8 md:px-12">
          <Card className="mb-5 p-5 md:p-6 hover-lift">
            <CardTitle>{UI.compare}</CardTitle>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                value={left}
                onChange={(event) => setLeft(event.target.value)}
                className="w-full rounded-xl border border-white/[.08] bg-transparent p-3.5 text-[14px] text-cream outline-none focus:border-[var(--gold-line)]"
                placeholder="Sol parfüm"
              />
              <input
                value={right}
                onChange={(event) => setRight(event.target.value)}
                className="w-full rounded-xl border border-white/[.08] bg-transparent p-3.5 text-[14px] text-cream outline-none focus:border-[var(--gold-line)]"
                placeholder="Sağ parfüm"
              />
            </div>
            <button
              type="button"
              onClick={runCompare}
              disabled={loading || !left.trim() || !right.trim()}
              className={`mt-4 rounded-lg px-5 py-2.5 text-[11px] font-mono uppercase tracking-[.1em] transition-colors ${
                loading || !left.trim() || !right.trim()
                  ? 'border border-white/[.08] bg-white/[.06] text-muted'
                  : 'bg-gold text-bg hover:bg-[#d8b676]'
              }`}
            >
              {loading ? 'Karşılaştırılıyor...' : 'Karşılaştırmayı Çalıştır'}
            </button>
            {error ? <p className="mt-3 text-[12px] text-[#f1a2a2]">{error}</p> : null}
          </Card>

          <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <ResultSide title="Sol Sonuç" row={leftResult} />
            <ResultSide title="Sağ Sonuç" row={rightResult} />
          </div>

          {leftResult && rightResult ? (
            <Card className="p-5 md:p-6 hover-lift">
              <CardTitle>Skor Karşılaştırması</CardTitle>
              <ScoreRow label="Yoğunluk" left={leftResult.intensity} right={rightResult.intensity} />
              <ScoreRow label="Tazelik" left={leftResult.scores.freshness} right={rightResult.scores.freshness} />
              <ScoreRow label="Tatlılık" left={leftResult.scores.sweetness} right={rightResult.scores.sweetness} />
              <ScoreRow label="Sıcaklık" left={leftResult.scores.warmth} right={rightResult.scores.warmth} />
            </Card>
          ) : null}
        </div>
      </ErrorBoundary>
    </AppShell>
  );
}
