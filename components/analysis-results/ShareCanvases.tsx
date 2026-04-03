'use client';

import type { RefObject } from 'react';
import { MoleculeVisual } from '@/components/MoleculeVisual';
import type { MoleculeData } from '@/components/MoleculeCard';
import type { AnalysisResult } from '@/lib/client/types';
import { AnimatedPercent } from './primitives';
import { clampPercent, moleculeAccent, toList } from './utils';

interface ShareCanvasesProps {
  result: AnalysisResult;
  confidence: number;
  molecule: MoleculeData | null;
  moleculeData: MoleculeData[];
  storyShareRef: RefObject<HTMLDivElement>;
  moleculeShareRef: RefObject<HTMLDivElement>;
}

export function ShareCanvases({
  result,
  confidence,
  molecule,
  moleculeData,
  storyShareRef,
  moleculeShareRef,
}: ShareCanvasesProps) {
  if (!molecule) return null;

  return (
    <>
      <div
        ref={storyShareRef}
        className="fixed -left-[9999px] top-0 flex h-[1280px] w-[720px] flex-col overflow-hidden rounded-[40px] border border-white/[.08] bg-[#09080a] p-10 text-cream"
      >
        <div className="rounded-[28px] border border-white/[.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-8">
          <p className="text-[12px] font-mono uppercase tracking-[.18em] text-gold/85">Koku Dedektifi</p>
          <h2 className="mt-5 font-display text-[4.4rem] leading-[0.94] text-cream">{result.name}</h2>
          <p className="mt-3 text-[16px] uppercase tracking-[.18em] text-muted">{result.family}</p>
        </div>

        <div className="mt-6 grid grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="rounded-[28px] border border-white/[.08] bg-white/[.03] p-6">
            <p className="text-[11px] font-mono uppercase tracking-[.16em] text-gold">Top 3 nota</p>
            <div className="mt-4 space-y-3 text-[20px] leading-tight text-cream">
              {[...toList(result.pyramid?.top, 2), ...toList(result.pyramid?.middle, 2), ...toList(result.pyramid?.base, 2)]
                .slice(0, 3)
                .map((note) => (
                  <p key={`story-${note}`}>{note}</p>
                ))}
            </div>

            <div className="mt-8 rounded-[24px] border border-[var(--gold-line)] bg-[var(--gold-dim)]/12 p-5">
              <p className="text-[11px] font-mono uppercase tracking-[.16em] text-gold/80">İz skoru</p>
              <p className="mt-3 text-[3.4rem] font-semibold leading-none text-cream">
                <AnimatedPercent value={confidence} />
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/[.08] bg-[#0c0b10] p-5">
            <MoleculeVisual name={molecule.name} smiles={molecule.smiles} formula={molecule.formula} compact />
            <p className="mt-4 text-[11px] font-mono uppercase tracking-[.16em] text-gold/80">Baskın molekül</p>
            <p className="mt-2 text-[1.8rem] font-semibold text-cream">{molecule.name}</p>
            <p className="mt-2 text-[14px] leading-relaxed text-cream/76">
              {molecule.explanation || `${molecule.name}, bu parfümün karakterini taşıyan temel moleküllerden biri.`}
            </p>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between rounded-[24px] border border-white/[.08] bg-white/[.03] px-6 py-5">
          <p className="text-[14px] text-cream/78">Koku Dedektifi ile analiz edildi</p>
          <p className="text-[12px] font-mono uppercase tracking-[.16em] text-gold">kokudedektifi.com</p>
        </div>
      </div>

      <div
        ref={moleculeShareRef}
        className="fixed -left-[9999px] top-0 w-[720px] overflow-hidden rounded-[32px] border border-white/[.08] bg-[#09080a] p-8 text-cream"
      >
        <p className="text-[11px] font-mono uppercase tracking-[.16em] text-gold">Molekül Katmanı</p>
        <div className="mt-4 flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-mono uppercase tracking-[.12em] text-muted">{result.family || 'Koku Profili'}</p>
            <h3 className="mt-3 font-display text-[2.4rem] leading-[1.02] text-cream">{result.name}</h3>
            <p className="mt-4 text-[14px] leading-relaxed text-cream/88">
              {molecule.explanation || `${molecule.name}, bu kompozisyonun belirgin izini taşıyan karakter moleküllerden biri.`}
            </p>
          </div>
          <div className="w-[240px] shrink-0 rounded-[28px] border border-white/[.08] bg-[#0c0b10] p-4">
            <MoleculeVisual name={molecule.name} smiles={molecule.smiles} formula={molecule.formula} compact />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {moleculeData.slice(0, 3).map((item, index) => (
            <div key={`${item.name}-share-${index}`} className="rounded-2xl border border-white/[.08] bg-white/[.03] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono uppercase tracking-[.12em]" style={{ color: moleculeAccent(index) }}>
                  {item.note === 'top' ? 'Üst Nota' : item.note === 'heart' ? 'Kalp Nota' : 'Alt Nota'}
                </span>
                <span className="text-[12px] font-mono text-cream/70">{clampPercent(item.pct, 50)}%</span>
              </div>
              <p className="mt-3 text-[17px] font-semibold text-cream">{item.name}</p>
              <p className="mt-1 text-[12px] text-muted">{item.type}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between">
          <p className="text-[12px] text-muted">Koku Dedektifi ile moleküler düzeyde analiz edildi.</p>
          <p className="text-[12px] font-mono uppercase tracking-[.14em] text-gold">kokudedektifi.com</p>
        </div>
      </div>
    </>
  );
}
