'use client';

import { Card } from '@/components/ui/Card';
import { ANALYSIS_STEPS } from './utils';

interface AnalysisLoadingStateProps {
  analysisStepIndex: number;
}

function SkeletonLine({ width }: { width: string }) {
  return (
    <div
      className="h-2.5 animate-pulse rounded-full"
      style={{
        width,
        background:
          'linear-gradient(90deg, color-mix(in srgb, var(--bg-card) 70%, white 30%) 0%, color-mix(in srgb, var(--bg-card) 52%, white 48%) 50%, color-mix(in srgb, var(--bg-card) 70%, white 30%) 100%)',
      }}
    />
  );
}

export function AnalysisLoadingState({ analysisStepIndex }: AnalysisLoadingStateProps) {
  const loadingStep = ANALYSIS_STEPS[analysisStepIndex] || 'Analiz hazirlaniyor...';
  const columns = [
    { title: 'Nota Piramidi', lines: ['92%', '84%', '72%', '58%'] },
    { title: 'Anahtar Molekuller', lines: ['88%', '80%', '68%', '54%'] },
    { title: 'Benzer Profiller', lines: ['90%', '82%', '74%', '60%'] },
  ];

  return (
    <div className="anim-up-1">
      <Card className="overflow-hidden border-[var(--gold-line)]/35 bg-[linear-gradient(145deg,rgba(201,169,110,0.08),rgba(9,9,14,0.96)_28%,rgba(124,58,237,0.06)_100%)] p-5 md:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[.08] bg-black/25 px-4 py-4 md:px-5">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-mono uppercase tracking-[.14em] text-gold/90">Analiz motoru</p>
            <h3 className="mt-2 text-[17px] font-semibold text-cream md:text-[20px]">Molekuler eslesme kuruluyor</h3>
            <p className="mt-2 text-[12px] text-muted">{loadingStep}</p>
          </div>

          <div className="relative mx-auto h-20 w-20 shrink-0">
            <div className="absolute inset-0 rounded-full border border-[var(--gold-line)]/40" />
            <div className="absolute inset-2 rounded-full border border-dashed border-white/25" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-[var(--gold-line)] border-t-[var(--gold)]" />
            <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--gold)] shadow-[0_0_14px_rgba(201,169,110,0.8)]" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_220px]">
          {columns.map((column) => (
            <div
              key={column.title}
              className="rounded-2xl border border-[var(--gold-line)]/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-4"
            >
              <p className="mb-4 text-[11px] font-mono uppercase tracking-[.14em] text-gold">{column.title}</p>
              <div className="space-y-3">
                {column.lines.map((width) => (
                  <SkeletonLine key={`${column.title}-${width}`} width={width} />
                ))}
              </div>
            </div>
          ))}

          <div className="relative flex min-h-[188px] items-center justify-center overflow-hidden rounded-2xl border border-white/[.1] bg-black/25">
            <div className="absolute -left-8 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.25)_0%,transparent_70%)]" />
            <div className="absolute -right-10 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(45,212,191,0.24)_0%,transparent_72%)]" />
            <div className="relative flex h-28 w-28 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[var(--gold-line)]/45" />
              <div className="absolute inset-3 animate-pulse rounded-full border border-white/20" />
              <div className="absolute h-16 w-16 animate-[spin_2.4s_linear_infinite] rounded-full border-2 border-[var(--gold-line)] border-t-transparent" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
