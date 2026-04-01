'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AnalysisTimeline } from '@/lib/client/types';

type TimelineStageId = 't0' | 't1' | 't2' | 't3';
type PyramidTier = 'ÜST' | 'KALP' | 'ALT';

interface TimelineStage {
  key: TimelineStageId;
  label: string;
  timeRange: string;
  notes: string[];
  description: string;
}

interface PyramidCard {
  label: PyramidTier;
  notes: string[];
}

interface StageTone {
  accent: string;
  border: string;
  subtleBorder: string;
  background: string;
  softBackground: string;
  text: string;
  dotShadow: string;
}

interface ScentTimelineProps {
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  timeline?: AnalysisTimeline | null;
}

const STAGE_META: Array<Omit<TimelineStage, 'notes' | 'description'>> = [
  { key: 't0', label: 'İLK DOKUNUŞ', timeRange: '0-15 dk' },
  { key: 't1', label: 'AÇILIM', timeRange: '15-60 dk' },
  { key: 't2', label: 'KALP', timeRange: '1-3 saat' },
  { key: 't3', label: 'DERİN İZ', timeRange: '3 saat+' },
];

const STAGE_TONES: Record<TimelineStageId, StageTone> = {
  t0: {
    accent: '#C9A96E',
    border: 'rgba(201,169,110,.42)',
    subtleBorder: 'rgba(201,169,110,.18)',
    background: 'rgba(201,169,110,.12)',
    softBackground: 'rgba(201,169,110,.08)',
    text: '#E8CF9E',
    dotShadow: '0 0 10px rgba(201,169,110,.55)',
  },
  t1: {
    accent: '#A78BFA',
    border: 'rgba(167,139,250,.42)',
    subtleBorder: 'rgba(167,139,250,.18)',
    background: 'rgba(167,139,250,.14)',
    softBackground: 'rgba(167,139,250,.09)',
    text: '#D7C8FF',
    dotShadow: '0 0 10px rgba(167,139,250,.58)',
  },
  t2: {
    accent: '#7EB8A4',
    border: 'rgba(126,184,164,.42)',
    subtleBorder: 'rgba(126,184,164,.18)',
    background: 'rgba(126,184,164,.14)',
    softBackground: 'rgba(126,184,164,.09)',
    text: '#BCE3D6',
    dotShadow: '0 0 10px rgba(126,184,164,.52)',
  },
  t3: {
    accent: '#8A8480',
    border: 'rgba(138,132,128,.34)',
    subtleBorder: 'rgba(138,132,128,.16)',
    background: 'rgba(138,132,128,.12)',
    softBackground: 'rgba(138,132,128,.08)',
    text: '#D0CBC7',
    dotShadow: '0 0 10px rgba(138,132,128,.4)',
  },
};

function uniqueNotes(values: string[], max = 6): string[] {
  const seen = new Set<string>();
  const items: string[] = [];

  values.forEach((value) => {
    const note = String(value || '').trim();
    if (!note) return;
    const key = note.toLocaleLowerCase('tr-TR');
    if (seen.has(key)) return;
    seen.add(key);
    items.push(note);
  });

  return items.slice(0, max);
}

function buildDescriptions(
  timeline: AnalysisTimeline | null | undefined,
  topNotes: string[],
  heartNotes: string[],
  baseNotes: string[],
): Record<TimelineStageId, string> {
  const topPrimary = uniqueNotes(topNotes, 3);
  const heartPrimary = uniqueNotes(heartNotes, 3);
  const basePrimary = uniqueNotes(baseNotes, 3);

  return {
    t0:
      timeline?.t0 ||
      `${topPrimary.join(', ') || 'Üst akor'} ilk temasta öne çıkar; koku henüz tenle yeni buluşurken ilk izlenimi belirler.`,
    t1:
      timeline?.t1 ||
      `${uniqueNotes([...topPrimary, ...heartPrimary], 4).join(', ') || 'Açılış akoru'} kısa süre içinde görünür olur ve karakterin yönünü netleştirir.`,
    t2:
      timeline?.t2 ||
      `${heartPrimary.join(', ') || 'Kalp notaları'} kompozisyonun ana omurgasını taşır ve kokunun asıl kimliğini burada hissedersin.`,
    t3:
      timeline?.t3 ||
      `${basePrimary.join(', ') || 'Baz iz'} tende kalan finali kurar; kalıcılık ve imza etkisi bu katmanda yerleşir.`,
  };
}

function progressGradientForStage(stage: TimelineStageId): string {
  if (stage === 't0') {
    return 'linear-gradient(90deg, #C9A96E 0%, #E4C790 100%)';
  }
  if (stage === 't1') {
    return 'linear-gradient(90deg, #C9A96E 0%, #B996EF 46%, #A78BFA 100%)';
  }
  if (stage === 't2') {
    return 'linear-gradient(90deg, #C9A96E 0%, #A78BFA 42%, #7EB8A4 100%)';
  }
  return 'linear-gradient(90deg, #C9A96E 0%, #A78BFA 34%, #7EB8A4 68%, #8A8480 100%)';
}

export function ScentTimeline({ topNotes, heartNotes, baseNotes, timeline }: ScentTimelineProps) {
  const [activeStep, setActiveStep] = useState(0);

  const steps = useMemo<TimelineStage[]>(() => {
    const descriptions = buildDescriptions(timeline, topNotes, heartNotes, baseNotes);

    return [
      {
        ...STAGE_META[0],
        notes: uniqueNotes(topNotes, 4),
        description: descriptions.t0,
      },
      {
        ...STAGE_META[1],
        notes: uniqueNotes([...topNotes.slice(0, 2), ...heartNotes.slice(0, 3)], 5),
        description: descriptions.t1,
      },
      {
        ...STAGE_META[2],
        notes: uniqueNotes(heartNotes, 5),
        description: descriptions.t2,
      },
      {
        ...STAGE_META[3],
        notes: uniqueNotes(baseNotes, 5),
        description: descriptions.t3,
      },
    ];
  }, [baseNotes, heartNotes, timeline, topNotes]);

  const pyramidCards = useMemo<PyramidCard[]>(
    () => [
      { label: 'ÜST', notes: uniqueNotes(topNotes, 6) },
      { label: 'KALP', notes: uniqueNotes(heartNotes, 6) },
      { label: 'ALT', notes: uniqueNotes(baseNotes, 6) },
    ],
    [baseNotes, heartNotes, topNotes],
  );

  useEffect(() => {
    setActiveStep(0);
  }, [timeline, topNotes, heartNotes, baseNotes]);

  const activeStepData = steps[activeStep] ?? steps[0];
  const activeTone = STAGE_TONES[activeStepData.key] ?? STAGE_TONES.t0;
  const progressPercent = steps.length > 0 ? ((activeStep + 1) / steps.length) * 100 : 0;

  return (
    <div className="flex flex-col">
      <div className="mb-6 flex items-center gap-3">
        <span className="h-px w-8 bg-[var(--gold-line)]" />
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--muted)]">Koku Gelişimi</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {steps.map((step, index) => (
          <button
            key={step.key}
            type="button"
            onClick={() => setActiveStep(index)}
            className={`cursor-pointer rounded-full border px-4 py-2 text-xs tracking-widest transition-all duration-200 ${
              activeStep === index ? 'text-white' : 'border-white/15 bg-white/5 text-white/50 hover:border-white/30 hover:text-white/80'
            }`}
            style={
              activeStep === index
                ? {
                    borderColor: STAGE_TONES[step.key].border,
                    background: STAGE_TONES[step.key].background,
                    boxShadow: `inset 0 0 0 1px ${STAGE_TONES[step.key].accent}`,
                  }
                : undefined
            }
          >
            {step.label}
          </button>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        {pyramidCards.map((tier) => (
          <div
            key={tier.label}
            className="min-w-0 rounded-xl border border-white/8 bg-white/4 p-4"
          >
            <p className="mb-2 text-[10px] tracking-widest text-purple-400">{tier.label}</p>
            <p className="break-words text-sm leading-relaxed text-white/80">
              {tier.notes.length > 0 ? tier.notes.join(' • ') : 'Veri sınırlı'}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-col gap-4 items-start md:flex-row">
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-xs tracking-widest" style={{ color: activeTone.text }}>
            {activeStepData.label}
          </p>
          <p className="text-base leading-relaxed text-white/90">{activeStepData.description}</p>
        </div>

        <div
          className="w-full shrink-0 rounded-2xl border p-4 backdrop-blur-sm md:w-44"
          style={{ borderColor: activeTone.border, background: activeTone.softBackground }}
        >
          <p className="mb-2 text-[10px] tracking-widest text-white/40">AKTİF PENCERE</p>
          <p className="mb-3 text-2xl font-bold text-white">{activeStepData.timeRange}</p>
          <div className="flex flex-col gap-1.5">
            {activeStepData.notes.map((note) => (
              <span
                key={`${activeStepData.key}-${note}`}
                className="rounded-full border bg-white/5 px-3 py-1 text-center text-xs font-medium text-white/80"
                style={{ borderColor: activeTone.border }}
              >
                {note}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mb-6 h-1 w-full overflow-hidden rounded-full bg-white/8">
        <div className="absolute inset-0 rounded-full bg-[linear-gradient(90deg,rgba(201,169,110,.12)_0%,rgba(167,139,250,.1)_40%,rgba(126,184,164,.1)_72%,rgba(138,132,128,.1)_100%)]" />
        {[25, 50, 75].map((stop) => (
          <div
            key={stop}
            className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-white/10"
            style={{ left: `calc(${stop}% - 0.5px)` }}
          />
        ))}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${progressPercent}%`,
            background: progressGradientForStage(activeStepData.key),
            boxShadow: `0 0 18px ${activeTone.softBackground}`,
          }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full transition-all duration-500"
          style={{ left: `calc(${progressPercent}% - 6px)`, background: activeTone.accent, boxShadow: activeTone.dotShadow }}
        />
      </div>

      <div className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <div
            key={`${step.key}-entry`}
            onClick={() => setActiveStep(index)}
            className="cursor-pointer rounded-xl border p-4 transition-all duration-200"
            style={
              activeStep === index
                ? {
                    borderColor: STAGE_TONES[step.key].border,
                    background: STAGE_TONES[step.key].softBackground,
                    boxShadow: `inset 0 0 0 1px ${STAGE_TONES[step.key].border}`,
                  }
                : {
                    borderColor: STAGE_TONES[step.key].subtleBorder,
                    background: 'rgba(255,255,255,.02)',
                  }
            }
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setActiveStep(index);
              }
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span
                className="text-[11px] font-medium tracking-widest"
                style={{ color: activeStep === index ? STAGE_TONES[step.key].text : STAGE_TONES[step.key].text, opacity: activeStep === index ? 1 : 0.72 }}
              >
                {step.label}
              </span>
              <span
                className="ml-2 shrink-0 whitespace-nowrap text-[11px]"
                style={{ color: activeStep === index ? STAGE_TONES[step.key].text : 'rgba(255,255,255,.36)' }}
              >
                {step.timeRange}
              </span>
            </div>

            <p
              className={`text-sm leading-relaxed ${
                activeStep === index ? 'font-medium text-white' : 'text-white/50'
              }`}
            >
              {step.notes.length > 0 ? step.notes.join(', ') : 'Veri sınırlı'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
