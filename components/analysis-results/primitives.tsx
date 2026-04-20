'use client';

import { useEffect, useState } from 'react';
import { animate, useMotionValue, useSpring } from 'framer-motion';
import { clampPercent } from './utils';

export function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[.05] pb-2">
      <span className="text-[10px] font-mono uppercase tracking-[.1em] text-[var(--hint)]">{label}</span>
      <span className="text-right text-cream">{value}</span>
    </div>
  );
}

function resolveConfidenceColor(pct: number): string {
  if (pct >= 70) return '#C9A96E'; // altın
  if (pct >= 40) return '#D97706'; // kehribar
  return '#EF4444'; // kırmızımsı
}

function resolveConfidenceLabel(pct: number): string {
  if (pct >= 70) return 'Yüksek Güven';
  if (pct >= 40) return 'Orta Güven';
  return 'Düşük Güven';
}

function resolveConfidenceHint(pct: number): string {
  if (pct >= 70) return 'Güçlü eşleşme';
  if (pct >= 40) return 'Yeniden çek önerilir';
  return 'Fotoğrafı netleştir';
}

export function ConfidenceRing({ pct }: { pct: number }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const dash = (clampPercent(pct) / 100) * circ;
  const color = resolveConfidenceColor(pct);
  const label = resolveConfidenceLabel(pct);
  const hint = resolveConfidenceHint(pct);

  return (
    <div className="group relative flex flex-col items-center gap-1.5" title={`Güven skoru: ${pct}/100 — ${label}`}>
      <svg
        width="72"
        height="72"
        viewBox="0 0 72 72"
        fill="none"
        aria-label={`Güven skoru ${pct}, ${label}`}
        role="img"
      >
        {/* Track */}
        <circle cx="36" cy="36" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        {/* Fill arc */}
        <circle
          cx="36"
          cy="36"
          r={r}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dasharray .9s cubic-bezier(.22,.68,0,1.2), stroke .4s ease' }}
        />
        {/* Numeric score */}
        <text x="36" y="33" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="13" fontWeight="600" fill={color}>
          {clampPercent(pct)}
        </text>
        <text x="36" y="44" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="7" fill="rgba(255,255,255,0.4)">
          / 100
        </text>
      </svg>

      <span
        className="rounded-full px-2 py-0.5 text-[8px] font-mono uppercase tracking-[.12em]"
        style={{ color, background: `${color}18`, border: `1px solid ${color}35` }}
      >
        {label}
      </span>
      <span className="text-[8px] font-mono text-white/35">{hint}</span>

      {/* Tooltip on hover */}
      <div
        className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded-xl border border-white/10 bg-[#1a1a1a] px-3 py-2 text-center text-[10px] text-white/70 shadow-xl group-hover:block"
        style={{ whiteSpace: 'nowrap', zIndex: 50 }}
        role="tooltip"
      >
        Skor nasıl hesaplanıyor?
        <br />
        <span className="text-gold/80">Molekül eşleşme × kanıt ağırlığı</span>
      </div>
    </div>
  );
}

export function SimilarityArc({ pct }: { pct: number }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 90 ? 'var(--gold)' : pct >= 75 ? 'var(--sage)' : 'var(--muted)';

  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <circle cx="18" cy="18" r={r} stroke="var(--border-md)" strokeWidth="2" />
        <circle
          cx="18"
          cy="18"
          r={r}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          transform="rotate(-90 18 18)"
        />
        <text x="18" y="22" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="8" fill={color}>
          {pct}
        </text>
      </svg>
      <span className="text-[7px] font-mono tracking-wider text-[var(--hint)]">%</span>
    </div>
  );
}

export function RadarWheel({ values }: { values: number[] }) {
  const axes = [
    { label: 'Tazelik', angle: -Math.PI / 2, value: values[0], color: 'var(--sage)' },
    { label: 'Tatlılık', angle: 0, value: values[1], color: '#d58ebb' },
    { label: 'Sıcaklık', angle: Math.PI / 2, value: values[2], color: 'var(--gold)' },
    { label: 'Yoğunluk', angle: Math.PI, value: values[3], color: '#8ab8c0' },
  ];
  const center = 92;
  const radius = 68;

  const polygon = axes
    .map((axis) => {
      const ratio = clampPercent(axis.value, 50) / 100;
      const x = center + Math.cos(axis.angle) * radius * ratio;
      const y = center + Math.sin(axis.angle) * radius * ratio;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox="0 0 184 184"
      className="h-[146px] w-[146px] sm:h-[168px] sm:w-[168px] md:h-[184px] md:w-[184px]"
      aria-label="Koku çarkı"
    >
      {[24, 44, 68].map((ring) => (
        <circle key={ring} cx={center} cy={center} r={ring} fill="none" stroke="rgba(255,255,255,.08)" />
      ))}

      {axes.map((axis) => {
        const outerX = center + Math.cos(axis.angle) * radius;
        const outerY = center + Math.sin(axis.angle) * radius;
        return (
          <g key={axis.label}>
            <line x1={center} y1={center} x2={outerX} y2={outerY} stroke="rgba(255,255,255,.08)" />
            <circle cx={outerX} cy={outerY} r="3.8" fill={axis.color} />
          </g>
        );
      })}

      <polygon points={polygon} fill="rgba(201,169,110,.18)" stroke="rgba(201,169,110,.74)" strokeWidth="1.4" />
      <circle cx={center} cy={center} r="5.5" fill="rgba(201,169,110,.72)" />
    </svg>
  );
}

export function SignalTelemetry({
  longevity,
  projection,
  fit,
  tags,
  barsReady,
}: {
  longevity: number;
  projection: number;
  fit: number;
  tags: string[];
  barsReady: boolean;
}) {
  const metrics = [
    {
      label: 'Kalıcılık',
      value: longevity,
      tone: '#d6a43b',
      glow: '0 0 7px rgba(214,164,59,0.38)',
      note: longevity >= 80 ? 'Çok kalıcı' : longevity >= 60 ? 'Dengeli' : 'Hafif',
    },
    {
      label: 'Yayılım',
      value: projection,
      tone: '#4a86f5',
      glow: '0 0 7px rgba(74,134,245,0.38)',
      note: projection >= 80 ? 'Güçlü' : projection >= 60 ? 'Orta' : 'Yakın ten',
    },
    {
      label: 'Uyum Skoru',
      value: fit,
      tone: '#9377d6',
      glow: '0 0 7px rgba(147,119,214,0.34)',
      note: fit >= 85 ? 'Çok yüksek' : fit >= 70 ? 'Yüksek' : 'Seçici',
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <p className="mb-2 text-[11px] font-mono uppercase tracking-[0.15em] text-white/50">{metric.label}</p>
            <div className="mb-2 flex h-2 gap-1">
              {Array.from({ length: 5 }).map((_, index) => {
                const threshold = (index + 1) * 20;
                const active = metric.value >= threshold;
                return (
                  <span
                    key={`${metric.label}-${index}`}
                    className="h-2 flex-1 rounded-full transition-all duration-700"
                    style={{
                      background: active ? metric.tone : 'rgba(255,255,255,.1)',
                      opacity: active ? 1 : 0.45,
                      boxShadow: active ? metric.glow : 'none',
                      transform: barsReady ? 'scaleX(1)' : 'scaleX(0.25)',
                      transformOrigin: 'left center',
                    }}
                  />
                );
              })}
            </div>
            <p className="mt-1 text-sm text-white/80">{metric.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-[14px] border border-white/[.08] px-3 py-2 text-[11px] font-mono uppercase tracking-[.08em] text-cream/92"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SceneCell({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-[18px] border border-white/[.07] bg-white/[.02] px-4 py-3">
      <p className="text-[9px] font-mono uppercase tracking-[.16em]" style={{ color: tone }}>
        {label}
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-cream/95">{value}</p>
    </div>
  );
}

export function MetricPill({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-[16px] border border-white/[.07] bg-white/[.02] px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono uppercase tracking-[.1em] text-muted">{label}</span>
        <span className="text-[11px] text-cream">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[.08]">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: tone }} />
      </div>
    </div>
  );
}

export function WheelMetricRail({
  label,
  value,
  tone,
  note,
}: {
  label: string;
  value: number;
  tone: string;
  note: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/[.07] bg-white/[.025] px-4 py-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[.14em] text-muted">{label}</p>
          <p className="mt-2 text-sm text-cream/90">{note}</p>
        </div>
        <div
          className="inline-flex h-8 min-w-[44px] items-center justify-center rounded-full border px-3 text-[12px] font-semibold text-cream"
          style={{ borderColor: `${tone}45`, background: `${tone}14` }}
        >
          {value}
        </div>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-white/[.08]">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, ${tone} 0%, color-mix(in srgb, ${tone} 80%, white 20%) 100%)`,
            boxShadow: `0 0 12px color-mix(in srgb, ${tone} 30%, transparent)`,
          }}
        />
      </div>
    </div>
  );
}

export function AnimatedPercent({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 120, damping: 20 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 0.6 });
    return () => controls.stop();
  }, [motionValue, value]);

  useEffect(() => {
    const unsubscribe = spring.on('change', (latest) => setDisplay(Math.round(latest)));
    return unsubscribe;
  }, [spring]);

  return <>{display}%</>;
}
