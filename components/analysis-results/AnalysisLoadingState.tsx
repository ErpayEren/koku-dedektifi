'use client';

import { UI } from '@/lib/strings';
import { Card } from '@/components/ui/Card';
import { SectionDivider } from '@/components/ui/SectionDivider';
import { ANALYSIS_STEPS } from './utils';

interface AnalysisLoadingStateProps {
  analysisStepIndex: number;
}

export function AnalysisLoadingState({ analysisStepIndex }: AnalysisLoadingStateProps) {
  return (
    <section className="anim-up-1 px-5 pb-8 md:px-12">
      <SectionDivider label="Analiz İşleniyor" />
      <Card className="overflow-hidden p-7 md:p-9">
        <div className="flex flex-col gap-7 md:flex-row md:items-center">
          <div className="relative flex h-28 w-28 items-center justify-center self-center rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)]/30 md:self-start">
            <div className="absolute inset-3 rounded-full border border-white/[.07] animate-[aura-breathe_6s_ease-in-out_infinite]" />
            <div className="absolute h-10 w-10 rounded-full bg-[radial-gradient(circle,rgba(167,139,250,.9)_0%,rgba(167,139,250,.15)_68%,transparent_100%)] blur-[1px]" />
            <div className="relative h-4 w-4 rounded-full bg-gold shadow-[0_0_22px_rgba(201,169,110,.35)]" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="mb-2 text-[1.9rem] font-semibold text-cream md:text-[2.15rem]">{UI.analyzing}</p>
            <p className="text-[13px] text-muted">{ANALYSIS_STEPS[analysisStepIndex]}</p>

            <div className="mt-6 h-[2px] overflow-hidden rounded-full bg-white/[.08]">
              <div
                className="h-full rounded-full shimmer-line"
                style={{ width: `${((analysisStepIndex + 1) / ANALYSIS_STEPS.length) * 100}%` }}
              />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
              {ANALYSIS_STEPS.map((step, index) => {
                const active = index === analysisStepIndex;
                return (
                  <span
                    key={step}
                    className={`rounded-full border px-3 py-1.5 text-[10px] font-mono uppercase tracking-[.1em] transition-all ${
                      active ? 'border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold' : 'border-white/[.07] text-muted'
                    }`}
                  >
                    {step.replace('...', '')}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
