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
  tone: string;
  anchor: number;
}

interface ScentTimelineProps {
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  timeline?: AnalysisTimeline | null;
}

const AUTO_ADVANCE_MS = 4600;

const STAGE_META: Array<Omit<TimelineStage, 'notes' | 'description'>> = [
  { id: 't0', label: 'İlk Dokunuş', timeLabel: '0-15 dk', tone: 'var(--gold)', anchor: 10 },
  { id: 't1', label: 'Açılım', timeLabel: '15-60 dk', tone: '#a78bfa', anchor: 36 },
  { id: 't2', label: 'Kalp', timeLabel: '1-3 saat', tone: 'var(--sage)', anchor: 64 },
  { id: 't3', label: 'Kalan İz', timeLabel: '3 saat+', tone: '#8ab8c0', anchor: 90 },
] as const;

function uniqueNotes(values: string[], max = 5): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  values.forEach((value) => {
    const note = String(value || '').trim();
    if (!note) return;
    const key = note.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(note);
  });

  return out.slice(0, max);
}

function buildDescriptions(
  timeline: AnalysisTimeline | null | undefined,
  topNotes: string[],
  heartNotes: string[],
  baseNotes: string[],
): Record<TimelineStageId, string> {
  return {
    t0:
      timeline?.t0 ||
      `${topNotes[0] || 'Üst akor'} ilk anda dikkat çeker; koku henüz tenle tam bütünleşmeden ışığını verir.`,
    t1:
      timeline?.t1 ||
      `${heartNotes[0] || 'Kalp notası'} görünmeye başlar; kompozisyon burada daha sıcak ve daha okunur hâle gelir.`,
    t2:
      timeline?.t2 ||
      `${heartNotes.slice(0, 2).join(', ') || 'Kalp akışı'} kokunun asıl kimliğini taşır ve profili belirginleştirir.`,
    t3:
      timeline?.t3 ||
      `${baseNotes.slice(0, 2).join(', ') || 'Baz iz'} tende kalan kalıcı imzaya dönüşür.`,
  };
}

function stagePreview(notes: string[]): string {
  if (notes.length === 0) return 'Veri sınırlı';
  return notes.slice(0, 3).join(' • ');
}

export function ScentTimeline({ topNotes, heartNotes, baseNotes, timeline }: ScentTimelineProps) {
  const [activeIndex, setActiveIndex] = useState(1);

  const stages = useMemo<TimelineStage[]>(() => {
    const descriptions = buildDescriptions(timeline, topNotes, heartNotes, baseNotes);
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
  }, [timeline, topNotes, heartNotes, baseNotes]);

  useEffect(() => {
    if (stages.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % stages.length);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [stages.length]);

  const activeStage = stages[activeIndex] ?? stages[0];

  return (
    <div className="flex flex-col gap-4 py-1">
      <div className="flex flex-wrap gap-2">
        {stages.map((stage, index) => {
          const active = index === activeIndex;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className="rounded-full border px-3.5 py-2 text-[10px] font-mono uppercase tracking-[.14em] transition-all"
              style={{
                color: active ? stage.tone : 'var(--muted)',
                borderColor: active ? stage.tone : 'rgba(255,255,255,.08)',
                background: active ? `${stage.tone}14` : 'rgba(255,255,255,.02)',
                boxShadow: active ? `0 0 20px ${stage.tone}18` : 'none',
              }}
            >
              {stage.label}
            </button>
          );
        })}
      </div>

      <div className="timeline-stage overflow-hidden rounded-[28px] border border-white/[.07] bg-[var(--bg-raise)]/88 p-4 md:p-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_264px]">
          <div className="rounded-[24px] border border-white/[.06] bg-black/12 p-4 md:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: 'Üst', notes: uniqueNotes(topNotes), tone: 'var(--gold)' },
                { label: 'Kalp', notes: uniqueNotes(heartNotes), tone: '#a78bfa' },
                { label: 'Alt', notes: uniqueNotes(baseNotes), tone: 'var(--sage)' },
              ].map((tier) => (
                <div key={tier.label} className="rounded-[18px] border border-white/[.06] bg-white/[.02] px-3.5 py-3.5">
                  <p className="text-[9px] font-mono uppercase tracking-[.16em]" style={{ color: tier.tone }}>
                    {tier.label}
                  </p>
                  <p className="mt-2 text-[12px] leading-relaxed text-cream/88">{stagePreview(tier.notes)}</p>
                </div>
              ))}
            </div>

            <div className="relative mt-4 overflow-hidden rounded-[24px] border border-white/[.06] bg-[#0c0b10] px-4 py-5 md:px-5 md:py-6">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(167,139,250,.12),transparent_40%)]" />
              <div className="pointer-events-none absolute inset-x-8 top-[46%] h-px bg-gradient-to-r from-transparent via-white/[.12] to-transparent" />
              <div className="pointer-events-none absolute inset-x-8 top-[46%] h-[4px] -translate-y-1/2 rounded-full bg-white/[.06]" />
              <div
                className="pointer-events-none absolute top-[46%] h-[4px] -translate-y-1/2 rounded-full bg-gradient-to-r from-[#d7bc82] via-[#a78bfa] to-[#7eb8a4]"
                style={{
                  left: '8%',
                  width: `${Math.max(0, activeStage.anchor - 8)}%`,
                  transition: `width ${AUTO_ADVANCE_MS - 500}ms linear`,
                }}
              />

              <div
                className="pointer-events-none absolute top-[46%] h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(167,139,250,.9)_0%,rgba(167,139,250,.24)_42%,rgba(167,139,250,0)_72%)]"
                style={{
                  left: `${activeStage.anchor}%`,
                  transition: `left ${AUTO_ADVANCE_MS - 500}ms linear`,
                }}
              />

              <div className="relative grid min-h-[260px] gap-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
                <div className="flex flex-col justify-end">
                  <p className="text-[10px] font-mono uppercase tracking-[.18em]" style={{ color: activeStage.tone }}>
                    {activeStage.label}
                  </p>
                  <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed text-cream/96">{activeStage.description}</p>

                  <div className="mt-5 space-y-3">
                    {stages.map((stage, index) => {
                      const active = index === activeIndex;
                      return (
                        <button
                          key={`${stage.id}-row`}
                          type="button"
                          onClick={() => setActiveIndex(index)}
                          className="flex w-full items-start gap-3 text-left transition-opacity"
                          style={{ opacity: active ? 1 : 0.42 }}
                        >
                          <span
                            className="mt-[6px] h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{
                              background: stage.tone,
                              boxShadow: active ? `0 0 14px ${stage.tone}` : 'none',
                            }}
                          />
                          <div>
                            <p className="text-[10px] font-mono uppercase tracking-[.18em]" style={{ color: stage.tone }}>
                              {stage.label}
                            </p>
                            <p className="mt-1 text-[13px] leading-relaxed text-cream/82">
                              {stage.notes.length > 0 ? stage.notes.join(', ') : 'Veri sınırlı'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/[.06] bg-white/[.02] px-4 py-4">
                  <p className="text-[9px] font-mono uppercase tracking-[.16em] text-muted">Aktif pencere</p>
                  <p className="mt-3 font-display text-[1.8rem] italic leading-none text-cream">{activeStage.timeLabel}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {activeStage.notes.slice(0, 4).map((note) => (
                      <span
                        key={`${activeStage.id}-${note}`}
                        className="rounded-full border border-white/[.08] px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-[.08em] text-cream/88"
                      >
                        {note}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative mt-5 flex items-center justify-between gap-3 px-1">
                {stages.map((stage, index) => {
                  const active = index === activeIndex;
                  return (
                    <button
                      key={`${stage.id}-marker`}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className="flex flex-col items-center gap-2 text-center"
                      style={{ width: `${100 / stages.length}%` }}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full transition-all"
                        style={{
                          background: active ? stage.tone : 'rgba(255,255,255,.2)',
                          boxShadow: active ? `0 0 16px ${stage.tone}` : 'none',
                        }}
                      />
                      <span
                        className="text-[9px] font-mono uppercase tracking-[.16em] transition-colors"
                        style={{ color: active ? stage.tone : 'var(--hint)' }}
                      >
                        {stage.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {stages.map((stage, index) => {
              const active = index === activeIndex;
              return (
                <button
                  key={`${stage.id}-summary`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className="w-full rounded-[20px] border px-4 py-3 text-left transition-all"
                  style={{
                    borderColor: active ? `${stage.tone}50` : 'rgba(255,255,255,.07)',
                    background: active ? `${stage.tone}12` : 'rgba(255,255,255,.02)',
                    transform: active ? 'translateX(0)' : 'translateX(0)',
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-mono uppercase tracking-[.16em]" style={{ color: stage.tone }}>
                      {stage.label}
                    </p>
                    <span className="text-[10px] font-mono uppercase tracking-[.12em] text-muted">{stage.timeLabel}</span>
                  </div>
                  <p className={`mt-2 text-[13px] leading-relaxed ${active ? 'text-cream/95' : 'text-muted'}`}>
                    {stage.notes.length > 0 ? stage.notes.join(', ') : 'Bu aşamada veri sınırlı'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
