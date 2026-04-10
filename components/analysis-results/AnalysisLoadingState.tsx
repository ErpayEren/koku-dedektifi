'use client';

import { Card } from '@/components/ui/Card';
import { ANALYSIS_STEPS } from './utils';

interface AnalysisLoadingStateProps {
  analysisStepIndex: number;
}

function SkeletonLine({ width }: { width: string }) {
  return (
    <div
      className="h-3 animate-pulse rounded-full"
      style={{
        width,
        background: 'color-mix(in srgb, var(--bg-card) 58%, white 42%)',
      }}
    />
  );
}

export function AnalysisLoadingState({ analysisStepIndex }: AnalysisLoadingStateProps) {
  const loadingStep = ANALYSIS_STEPS[analysisStepIndex] || 'Analiz hazırlanıyor...';

  return (
    <div className="anim-up-1">
      <Card className="overflow-hidden p-5 md:p-7">
        <div className="mb-6 space-y-3">
          <div className="h-3 w-28 animate-pulse rounded-full bg-[var(--gold-line)]" />
          <div
            className="h-11 w-[min(460px,88%)] animate-pulse rounded-xl"
            style={{
              background: 'color-mix(in srgb, var(--bg-card) 52%, white 48%)',
            }}
          />
          <p className="text-[12px] text-muted">{loadingStep}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_220px]">
          {[
            { title: 'Nota Piramidi', lines: ['92%', '84%', '70%', '62%'] },
            { title: 'Anahtar Moleküller', lines: ['88%', '76%', '81%', '58%'] },
            { title: 'Benzer Profiller', lines: ['90%', '83%', '69%', '54%'] },
          ].map((column) => (
            <div
              key={column.title}
              className="rounded-2xl border border-[var(--gold-line)]/40 p-4"
              style={{ background: 'color-mix(in srgb, var(--bg-card) 86%, white 14%)' }}
            >
              <p className="mb-4 text-[11px] font-mono uppercase tracking-[.14em] text-gold">{column.title}</p>
              <div className="space-y-3">
                {column.lines.map((width) => (
                  <SkeletonLine key={`${column.title}-${width}`} width={width} />
                ))}
              </div>
            </div>
          ))}

          <div
            className="flex min-h-[188px] items-center justify-center rounded-2xl border border-white/[.09]"
            style={{ background: 'color-mix(in srgb, var(--bg-card) 88%, white 12%)' }}
          >
            <div className="relative flex h-28 w-28 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[var(--gold-line)]/50" />
              <div className="absolute inset-2 rounded-full border border-dashed border-white/20" />
              <div className="h-16 w-16 animate-spin rounded-full border-2 border-[var(--gold-line)] border-t-[var(--gold)]" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
