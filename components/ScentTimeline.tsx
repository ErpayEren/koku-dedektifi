'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AnalysisTimeline } from '@/lib/client/types';

type TimelineStageId = 't0' | 't1' | 't2' | 't3';

interface TimelineStage {
  id: TimelineStageId;
  label: string;
  timeLabel: string;
  notes: string[];
  description: string;
  color: string;
}

interface ScentTimelineProps {
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  timeline?: AnalysisTimeline | null;
}

const STAGE_META: Array<Omit<TimelineStage, 'notes' | 'description'>> = [
  { id: 't0', label: 'Ilk Bugu', timeLabel: '0-15 dk', color: 'var(--gold)' },
  { id: 't1', label: 'Acilim', timeLabel: '15-60 dk', color: '#a78bfa' },
  { id: 't2', label: 'Kalp', timeLabel: '1-3 saat', color: 'var(--sage)' },
  { id: 't3', label: 'Derin Iz', timeLabel: '3 saat+', color: 'var(--muted)' },
];

function uniqueNotes(values: string[], max = 6): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
    if (out.length >= max) break;
  }
  return out;
}

function buildTimelineDescriptions(
  timeline: AnalysisTimeline | null | undefined,
  topNotes: string[],
  heartNotes: string[],
  baseNotes: string[],
): Record<TimelineStageId, string> {
  return {
    t0: timeline?.t0 || `${topNotes[0] || 'Ust notalar'} parliyor, ilk imza kuruluyor.`,
    t1: timeline?.t1 || `${heartNotes[0] || 'Kalp notalar'} gorunmeye basliyor, profil aciliyor.`,
    t2: timeline?.t2 || `${heartNotes.slice(0, 2).join(', ') || 'Kalp akis'} karakteri merkeze aliyor.`,
    t3: timeline?.t3 || `${baseNotes.slice(0, 2).join(', ') || 'Baz iz'} tende uzun sure kaliyor.`,
  };
}

export function ScentTimeline({ topNotes, heartNotes, baseNotes, timeline }: ScentTimelineProps) {
  const [activeIndex, setActiveIndex] = useState(1);
  const [autoPlay, setAutoPlay] = useState(true);

  const stages = useMemo<TimelineStage[]>(() => {
    const descriptions = buildTimelineDescriptions(timeline, topNotes, heartNotes, baseNotes);
    return [
      {
        ...STAGE_META[0],
        notes: uniqueNotes(topNotes),
        description: descriptions.t0,
      },
      {
        ...STAGE_META[1],
        notes: uniqueNotes([...topNotes.slice(0, 2), ...heartNotes.slice(0, 2)]),
        description: descriptions.t1,
      },
      {
        ...STAGE_META[2],
        notes: uniqueNotes(heartNotes),
        description: descriptions.t2,
      },
      {
        ...STAGE_META[3],
        notes: uniqueNotes(baseNotes),
        description: descriptions.t3,
      },
    ];
  }, [baseNotes, heartNotes, timeline, topNotes]);

  useEffect(() => {
    setActiveIndex(1);
    setAutoPlay(true);
  }, [timeline, topNotes, heartNotes, baseNotes]);

  useEffect(() => {
    if (!autoPlay) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % stages.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [autoPlay, stages.length]);

  const activeStage = stages[activeIndex] ?? stages[0];
  const progressPct = (activeIndex / Math.max(1, stages.length - 1)) * 100;
  const activeNotes = activeStage.notes.length > 0 ? activeStage.notes : ['Karakter akisinda notalar toplanıyor'];

  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="grid grid-cols-3 gap-3 text-xs font-mono">
        {[
          { label: 'UST', values: uniqueNotes(topNotes), color: 'var(--gold)' },
          { label: 'KALP', values: uniqueNotes(heartNotes), color: '#a78bfa' },
          { label: 'ALT', values: uniqueNotes(baseNotes), color: 'var(--sage)' },
        ].map((tier) => (
          <div key={tier.label} className="flex flex-col gap-1">
            <span className="text-[9px] tracking-[.12em] uppercase" style={{ color: tier.color }}>
              {tier.label}
            </span>
            <span className="min-h-[2.2em] leading-snug text-cream">
              {tier.values.length > 0 ? tier.values.join(' / ') : 'Nota verisi sinirli'}
            </span>
          </div>
        ))}
      </div>

      <div className="timeline-stage relative overflow-hidden rounded-[26px] border border-white/[.07] bg-[var(--bg-raise)] px-5 py-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(167,139,250,.16),transparent_42%)] opacity-70" />
        <div className="pointer-events-none absolute left-1/2 top-[38%] z-[1] h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full timeline-orb" style={{ background: activeStage.color }} />

        {activeNotes.slice(0, 4).map((note, index) => (
          <div
            key={`${activeStage.id}-${note}`}
            className="timeline-note-chip absolute z-[2] hidden rounded-full border border-white/[.08] bg-black/25 px-3 py-1 text-[10px] font-mono uppercase tracking-[.12em] text-cream/80 md:block"
            style={{
              top: `${18 + index * 14}%`,
              left: `${8 + (index % 2) * 54}%`,
              animationDelay: `${index * 160}ms`,
            }}
          >
            {note}
          </div>
        ))}

        <div className="relative z-[2] mb-5 flex flex-wrap gap-2">
          {stages.map((stage, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => {
                  setActiveIndex(index);
                  setAutoPlay(false);
                }}
                className={`rounded-full border px-3.5 py-2 text-[10px] font-mono uppercase tracking-[.14em] transition-all ${
                  isActive ? 'shadow-[0_0_0_1px_rgba(255,255,255,.02)]' : 'text-muted'
                }`}
                style={{
                  color: isActive ? stage.color : 'var(--muted)',
                  borderColor: isActive ? stage.color : 'rgba(255,255,255,.08)',
                  background: isActive ? `${stage.color}12` : 'rgba(255,255,255,.02)',
                }}
              >
                {stage.label}
              </button>
            );
          })}
        </div>

        <div className="relative z-[2] mb-7 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stages.map((stage, index) => {
            const isActive = index === activeIndex;
            return (
              <div key={`${stage.id}-descriptor`} className={`transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-35'}`}>
                <p className="text-[10px] font-mono uppercase tracking-[.16em]" style={{ color: isActive ? stage.color : 'var(--hint)' }}>
                  {stage.label}
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-cream/90">{stage.notes.join(' / ') || 'Nota gecisi hazirlaniyor'}</p>
              </div>
            );
          })}
        </div>

        <div className="relative z-[2] mb-4">
          <div className="mb-3 flex items-center justify-between text-[10px] font-mono uppercase tracking-[.16em] text-muted">
            <span>Koku yolu</span>
            <span style={{ color: activeStage.color }}>{activeStage.timeLabel}</span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-white/[.08]">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#a78bfa] via-[#8ab8c0] to-[#c9a96e] transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
            <div
              className="absolute top-1/2 h-6 w-6 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-[var(--bg)] transition-all duration-700"
              style={{ left: `${progressPct}%`, background: activeStage.color, boxShadow: `0 0 16px ${activeStage.color}` }}
            />
          </div>
        </div>

        <div className="relative z-[2] space-y-3">
          {stages.map((stage, index) => {
            const isActive = index === activeIndex;
            return (
              <div key={`${stage.id}-row`} className={`flex items-start gap-3 transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-35'}`}>
                <div
                  className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full transition-all duration-300"
                  style={{ background: stage.color, boxShadow: isActive ? `0 0 12px ${stage.color}` : 'none' }}
                />
                <div className="min-w-0">
                  <span className="mr-2 text-[10px] font-mono uppercase tracking-[.16em]" style={{ color: stage.color }}>
                    {stage.label}
                  </span>
                  <span className={`text-sm ${isActive ? 'font-medium text-cream' : 'text-muted'}`}>
                    {isActive ? stage.description : stage.notes.join(', ') || 'Gecis bekleniyor'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
