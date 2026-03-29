'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { analyzeText, readableError } from '@/lib/client/api';
import type { AnalysisResult } from '@/lib/client/types';
import { UI } from '@/lib/strings';

function ScoreRow({ label, left, right }: { label: string; left: number; right: number }) {
  const winner = left === right ? 'equal' : left > right ? 'left' : 'right';
  return (
    <div className="grid grid-cols-[110px_1fr_1fr] gap-3 items-center text-[12px] border-b border-white/[.06] py-2">
      <span className="text-muted">{label}</span>
      <span className={winner === 'left' ? 'text-sage' : 'text-cream'}>{left}</span>
      <span className={winner === 'right' ? 'text-sage' : 'text-cream'}>{right}</span>
    </div>
  );
}

function ResultSide({ title, row }: { title: string; row: AnalysisResult | null }) {
  return (
    <Card className="p-5 hover-lift">
      <CardTitle>{title}</CardTitle>
      {!row ? (
        <p className="text-[12px] text-muted">Analiz bekleniyor.</p>
      ) : (
        <div className="anim-up">
          <p className="font-display italic text-[1.8rem] text-cream leading-[1.06]">{row.name}</p>
          <p className="text-[11px] text-muted mt-1">{row.family}</p>
          <p className="text-[12px] text-muted mt-3">{row.description.slice(0, 130)}…</p>
        </div>
      )}
    </Card>
  );
}

export default function KarsilastirPage() {
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
    setLoading(true);
    setError('');
    try {
      const [l, r] = await Promise.all([analyzeText(left), analyzeText(right)]);
      setLeftResult(l);
      setRightResult(r);
    } catch (err) {
      setError(readableError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <TopBar title={UI.compare} />
      <div className="px-5 md:px-12 py-8">
        <Card className="p-5 md:p-6 mb-5 hover-lift">
          <CardTitle>{UI.compare}</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            className={`mt-4 px-5 py-2.5 rounded-lg text-[11px] font-mono tracking-[.1em] uppercase transition-colors
            ${
              loading || !left.trim() || !right.trim()
                ? 'bg-white/[.06] text-muted border border-white/[.08]'
                : 'bg-gold text-bg hover:bg-[#d8b676]'
            }`}
          >
            {loading ? 'Karşılaştırılıyor…' : 'Karşılaştırmayı Çalıştır'}
          </button>
          {error ? <p className="text-[12px] text-[#f1a2a2] mt-3">{error}</p> : null}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
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
    </AppShell>
  );
}

