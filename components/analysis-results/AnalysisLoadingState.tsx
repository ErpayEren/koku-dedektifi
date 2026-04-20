'use client';

import { Card } from '@/components/ui/Card';
import { ANALYSIS_STEPS } from './utils';

interface AnalysisLoadingStateProps {
  analysisStepIndex: number;
}

function SkeletonLine({ width, delay = 0 }: { width: string; delay?: number }) {
  return (
    <div
      className="h-2.5 animate-pulse rounded-full"
      style={{
        width,
        animationDelay: `${delay}ms`,
        background:
          'linear-gradient(90deg, color-mix(in srgb, var(--bg-card) 70%, white 30%) 0%, color-mix(in srgb, var(--bg-card) 52%, white 48%) 50%, color-mix(in srgb, var(--bg-card) 70%, white 30%) 100%)',
      }}
    />
  );
}

const STEP_ICONS = ['🔍', '🌸', '💎', '🧬', '🔬', '📊'] as const;

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="mt-3 flex items-center gap-1.5" role="progressbar" aria-valuenow={current + 1} aria-valuemax={total} aria-label="Analiz adımı">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="inline-block h-1.5 rounded-full transition-all duration-300"
          style={{
            width: i === current ? '20px' : '6px',
            background: i <= current ? 'var(--gold)' : 'rgba(255,255,255,0.12)',
          }}
        />
      ))}
    </div>
  );
}

export function AnalysisLoadingState({ analysisStepIndex }: AnalysisLoadingStateProps) {
  const safeIndex = analysisStepIndex % ANALYSIS_STEPS.length;
  const loadingStep = ANALYSIS_STEPS[safeIndex] ?? 'Analiz hazırlanıyor...';
  const stepIcon = STEP_ICONS[safeIndex] ?? '🔍';

  const columns = [
    { title: 'Nota Piramidi', lines: [{ w: '92%', d: 0 }, { w: '84%', d: 80 }, { w: '72%', d: 160 }, { w: '58%', d: 240 }] },
    { title: 'Anahtar Moleküller', lines: [{ w: '88%', d: 60 }, { w: '80%', d: 140 }, { w: '68%', d: 220 }, { w: '54%', d: 300 }] },
    { title: 'Benzer Profiller', lines: [{ w: '90%', d: 30 }, { w: '82%', d: 110 }, { w: '74%', d: 190 }, { w: '60%', d: 270 }] },
  ];

  return (
    <div className="anim-up-1">
      <Card className="overflow-hidden border-[var(--gold-line)]/35 bg-[linear-gradient(145deg,rgba(201,169,110,0.08),rgba(9,9,14,0.96)_28%,rgba(124,58,237,0.06)_100%)] p-5 md:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[.08] bg-black/25 px-4 py-4 md:px-5">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-mono uppercase tracking-[.14em] text-gold/90">Analiz motoru</p>
            <h3 className="mt-2 text-[17px] font-semibold text-cream md:text-[20px]">Moleküler eşleşme kuruluyor</h3>
            <p
              key={loadingStep}
              className="mt-2 text-[12px] text-muted transition-opacity duration-300"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="mr-1.5" aria-hidden="true">{stepIcon}</span>
              {loadingStep}
            </p>
            <StepDots total={ANALYSIS_STEPS.length} current={safeIndex} />
          </div>

          <div className="relative mx-auto h-20 w-20 shrink-0" aria-hidden="true">
            <div className="absolute inset-0 rounded-full border border-[var(--gold-line)]/40" />
            <div className="absolute inset-2 rounded-full border border-dashed border-white/25" />
            <div
              className="absolute inset-0 rounded-full border-2 border-[var(--gold-line)] border-t-[var(--gold)]"
              style={{ animation: 'spin 1s linear infinite' }}
            />
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
                {column.lines.map(({ w, d }) => (
                  <SkeletonLine key={`${column.title}-${w}`} width={w} delay={d} />
                ))}
              </div>
            </div>
          ))}

          <div className="relative flex min-h-[188px] items-center justify-center overflow-hidden rounded-2xl border border-white/[.1] bg-black/25" aria-hidden="true">
            <div className="absolute -left-8 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.25)_0%,transparent_70%)]" />
            <div className="absolute -right-10 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(45,212,191,0.24)_0%,transparent_72%)]" />
            <div className="relative flex h-28 w-28 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[var(--gold-line)]/45" />
              <div className="absolute inset-3 animate-pulse rounded-full border border-white/20" />
              <div className="absolute h-16 w-16 rounded-full border-2 border-[var(--gold-line)] border-t-transparent" style={{ animation: 'spin 2.4s linear infinite' }} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
