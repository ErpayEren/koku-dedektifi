'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

type TimelineStageId = 'top' | 'dry' | 'heart' | 'base';

interface TimelineStage {
  id: TimelineStageId;
  label: string;
  timeLabel: string;
  notes: string[];
  description: string;
  color: string;
  pct: number;
}

interface ScentTimelineProps {
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
}

const STAGES: Omit<TimelineStage, 'notes'>[] = [
  {
    id: 'top',
    label: 'Ilk Bugu',
    timeLabel: '0-15 dk',
    description: 'Ust notalar one cikiyor, ilk izlenim olusuyor.',
    color: 'var(--gold)',
    pct: 0,
  },
  {
    id: 'dry',
    label: 'Acilim',
    timeLabel: '15-60 dk',
    description: 'Koku aciliyor, kalp notalar beliriyor.',
    color: '#a78bfa',
    pct: 33,
  },
  {
    id: 'heart',
    label: 'Kalp',
    timeLabel: '1-3 saat',
    description: 'Kalp notalar hakim, koku karakteri netlesiyor.',
    color: 'var(--sage)',
    pct: 66,
  },
  {
    id: 'base',
    label: 'Derin Iz',
    timeLabel: '3 saat+',
    description: 'Baz notalar kalarak derin ve isinmis iz birakiyor.',
    color: 'var(--muted)',
    pct: 90,
  },
];

const GRADIENT_MAP: Record<TimelineStageId, string> = {
  top: 'from-[#C9A96E] to-[#a78bfa]',
  dry: 'from-[#a78bfa] to-[#7EB8A4]',
  heart: 'from-[#7EB8A4] to-[#5a6a7a]',
  base: 'from-[#5a6a7a] to-[#3F3B45]',
};

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

export function ScentTimeline({ topNotes, heartNotes, baseNotes }: ScentTimelineProps) {
  const [value, setValue] = useState(0);
  const [isDragging, setDrag] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const stagesWithNotes = useMemo<TimelineStage[]>(
    () =>
      STAGES.map((stage) => ({
        ...stage,
        notes:
          stage.id === 'top'
            ? uniqueNotes(topNotes)
            : stage.id === 'dry'
              ? uniqueNotes([...topNotes.slice(0, 1), ...heartNotes.slice(0, 2)])
              : stage.id === 'heart'
                ? uniqueNotes(heartNotes)
                : uniqueNotes(baseNotes),
      })),
    [topNotes, heartNotes, baseNotes],
  );

  const activeStage = useMemo(
    () => [...STAGES].reverse().find((stage) => value >= stage.pct) ?? STAGES[0],
    [value],
  );
  const activeWithNotes = stagesWithNotes.find((stage) => stage.id === activeStage.id) ?? stagesWithNotes[0];

  const handlePointer = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const raw = ((event.clientX - rect.left) / rect.width) * 100;
    setValue(Math.min(100, Math.max(0, raw)));
  }, []);

  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="grid grid-cols-3 gap-3 text-xs font-mono">
        {(['top', 'heart', 'base'] as const).map((tier, index) => {
          const notes = tier === 'top' ? uniqueNotes(topNotes) : tier === 'heart' ? uniqueNotes(heartNotes) : uniqueNotes(baseNotes);
          const label = ['UST', 'KALP', 'ALT'][index];
          const color =
            tier === activeStage.id
              ? activeStage.color
              : tier === 'heart' && activeStage.id === 'dry'
                ? '#a78bfa'
                : 'var(--hint)';

          return (
            <div key={tier} className="flex flex-col gap-1 transition-all duration-300">
              <span className="text-[9px] tracking-[.12em] uppercase" style={{ color }}>
                {label}
              </span>
              <span className="text-[var(--cream)] leading-snug min-h-[2.1em]">
                {notes.length > 0 ? notes.join(' • ') : 'Nota verisi sinirli'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="relative h-6 flex items-end">
        <div className="absolute bottom-0 transition-all duration-500 ease-out" style={{ left: `calc(${value}% - 6px)` }}>
          <div className="w-3 h-3 rounded-full blur-[2px] opacity-80" style={{ background: activeStage.color }} />
          <div className="absolute inset-0 w-3 h-3 rounded-full opacity-30 scale-[2.5]" style={{ background: activeStage.color }} />
        </div>
      </div>

      <div className="flex justify-between text-[9px] font-mono tracking-[.1em] uppercase text-[var(--hint)] -mb-2">
        {STAGES.map((stage) => (
          <span key={stage.id} className="transition-colors duration-200" style={{ color: stage.id === activeStage.id ? activeStage.color : undefined }}>
            {stage.label}
          </span>
        ))}
      </div>

      <div
        ref={trackRef}
        className="relative h-2 rounded-full cursor-pointer select-none"
        style={{ background: 'var(--border-md)' }}
        onPointerDown={(event) => {
          setDrag(true);
          if ('setPointerCapture' in event.currentTarget) {
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          handlePointer(event);
        }}
        onPointerMove={(event) => {
          if (isDragging) handlePointer(event);
        }}
        onPointerUp={() => setDrag(false)}
        onPointerCancel={() => setDrag(false)}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        aria-label="Koku gelisim asamasi"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') setValue((prev) => Math.min(100, prev + 5));
          if (event.key === 'ArrowLeft') setValue((prev) => Math.max(0, prev - 5));
        }}
      >
        <div
          className={`absolute left-0 top-0 h-full rounded-full bg-gradient-to-r ${GRADIENT_MAP[activeStage.id]} transition-all duration-150`}
          style={{ width: `${value}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 shadow-lg transition-transform duration-100"
          style={{
            left: `${value}%`,
            background: activeStage.color,
            borderColor: 'var(--bg)',
            boxShadow: `0 0 12px ${activeStage.color}60`,
            transform: `translateX(-50%) translateY(-50%) scale(${isDragging ? 1.25 : 1})`,
          }}
        />
      </div>

      <div className="flex flex-col gap-3">
        {stagesWithNotes.map((stage) => (
          <div key={stage.id} className="flex items-start gap-3 transition-all duration-300" style={{ opacity: stage.id === activeStage.id ? 1 : 0.35 }}>
            <div
              className="mt-1 w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300"
              style={{ background: stage.color, boxShadow: stage.id === activeStage.id ? `0 0 8px ${stage.color}` : 'none' }}
            />
            <div>
              <span className="text-[10px] font-mono tracking-[.1em] uppercase mr-2" style={{ color: stage.color }}>
                {stage.label}
              </span>
              {stage.id === activeStage.id ? (
                <span className="text-sm text-[var(--cream)] font-medium">{stage.description}</span>
              ) : (
                <span className="text-xs text-[var(--muted)]">{stage.notes.join(', ') || 'Nota gecisi bekleniyor'}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center font-mono text-[10px] tracking-[.16em] uppercase" style={{ color: activeWithNotes.color }}>
        {activeWithNotes.label} - {activeWithNotes.timeLabel}
      </div>
    </div>
  );
}

