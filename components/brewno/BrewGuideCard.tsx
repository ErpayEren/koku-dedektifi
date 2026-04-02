'use client';

import { useState } from 'react';
import { type BrewGuideStep as StepType, type BrewGuide } from '@/lib/brewno';

interface BrewGuideCardProps {
  guide: BrewGuide;
  expanded?: boolean;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:     '#7eb8a4',
  intermediate: '#c9a96e',
  advanced:     '#e05252',
};

const METHOD_ICONS: Record<string, string> = {
  v60:           '🌀',
  espresso:      '⚡',
  aeropress:     '🔬',
  'french-press':'🫖',
  chemex:        '⚗️',
  'moka-pot':    '🍵',
  'cold-brew':   '🧊',
};

function formatTime(seconds: number): string {
  if (seconds >= 3600) return `${Math.round(seconds / 3600)}h`;
  if (seconds >= 60) return `${Math.round(seconds / 60)}m`;
  return `${seconds}s`;
}

export function BrewGuideCard({ guide, expanded: initialExpanded = false }: BrewGuideCardProps) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [activeStep, setActiveStep] = useState(0);

  const diffColor = guide.difficulty ? (DIFFICULTY_COLORS[guide.difficulty] ?? '#8a8480') : '#8a8480';
  const steps = (guide.steps ?? []) as StepType[];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03]">
      {/* Header */}
      <button
        type="button"
        className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-white/[0.03]"
        onClick={() => setExpanded((p) => !p)}
        aria-expanded={expanded}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-2xl">
          {METHOD_ICONS[guide.method] ?? '☕'}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base font-medium text-cream">{guide.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs capitalize" style={{ color: diffColor }}>
              {guide.difficulty}
            </span>
            {guide.brew_time_seconds != null && (
              <span className="text-xs text-white/40">
                {formatTime(guide.brew_time_seconds)} brew
              </span>
            )}
            {guide.coffee_to_water_ratio && (
              <span className="text-xs text-white/40">1:{guide.coffee_to_water_ratio.split(':')[1]} ratio</span>
            )}
            {guide.water_temp_c && (
              <span className="text-xs text-white/40">{guide.water_temp_c}°C</span>
            )}
          </div>
        </div>

        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          className={`shrink-0 text-white/30 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-white/[0.06] px-5 pb-5 pt-4 animate-fade-in">
          {guide.description && (
            <p className="mb-4 text-sm leading-relaxed text-white/60">{guide.description}</p>
          )}

          {/* Quick specs */}
          <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'Grind', value: guide.recommended_grind },
              { label: 'Temp', value: guide.water_temp_c ? `${guide.water_temp_c}°C` : null },
              { label: 'Ratio', value: guide.coffee_to_water_ratio },
              { label: 'Yield', value: guide.yield_ml ? `${guide.yield_ml}ml` : null },
            ].map(({ label, value }) => value ? (
              <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/30">{label}</p>
                <p className="mt-0.5 text-xs font-medium text-cream/80">{value}</p>
              </div>
            ) : null)}
          </div>

          {/* Steps */}
          {steps.length > 0 && (
            <div className="space-y-2">
              {steps.map((step, i) => (
                <button
                  key={step.step}
                  type="button"
                  className={`w-full rounded-xl border p-4 text-left transition-all duration-200 ${
                    activeStep === i
                      ? 'border-amber-500/30 bg-amber-500/10'
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                  onClick={() => setActiveStep(i)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                        activeStep === i
                          ? 'bg-amber-500 text-black'
                          : 'bg-white/[0.08] text-white/50'
                      }`}
                    >
                      {step.step}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium transition-colors ${activeStep === i ? 'text-amber-100' : 'text-cream/80'}`}>
                        {step.title}
                      </p>
                      {activeStep === i && (
                        <div className="mt-2 space-y-1.5 animate-fade-in">
                          <p className="text-sm leading-relaxed text-white/70">
                            {step.description}
                          </p>
                          {step.tip && (
                            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2">
                              <span className="text-amber-400 shrink-0">💡</span>
                              <p className="text-xs text-amber-200/70 leading-relaxed">{step.tip}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {step.duration > 0 && step.duration < 3600 && (
                      <span className="shrink-0 text-[11px] text-white/30">{formatTime(step.duration)}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
