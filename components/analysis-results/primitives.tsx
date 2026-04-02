'use client';

import { useEffect, useState } from 'react';
import { animate, useMotionValue, useSpring } from 'framer-motion';
import { clampPercent } from './utils';

export function PyramidRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-white/[.06] p-3.5">
      <p className="mb-1.5 text-[10px] font-mono uppercase tracking-[.1em] text-muted">{label}</p>
      <p className="leading-relaxed text-cream/95">{items.length > 0 ? items.join(' / ') : 'Veri sınırlı'}</p>
    </div>
  );
}

export function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[.05] pb-2">
      <span className="text-[10px] font-mono uppercase tracking-[.1em] text-[var(--hint)]">{label}</span>
      <span className="text-right text-cream">{value}</span>
    </div>
  );
}

export function ConfidenceRing({ pct }: { pct: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-label={`Güven skoru ${pct}`}>
        <circle cx="28" cy="28" r={r} stroke="var(--border-md)" strokeWidth="2.5" />
        <circle
          cx="28"
          cy="28"
          r={r}
          stroke="var(--gold)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          transform="rotate(-90 28 28)"
          style={{ transition: 'stroke-dasharray .8s cubic-bezier(.22,.68,0,1.2)' }}
        />
        <text x="28" y="32" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="11" fill="var(--gold)">
          {pct}%
        </text>
      </svg>
      <span className="text-[8px] font-mono tracking-[.1em] uppercase text-[var(--muted)]">Güven</span>
    </div>
  );
}

export function SimilarityArc({ pct }: { pct: number }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 90 ? 'var(--gold)' : pct >= 75 ? 'var(--sage)' : 'var(--muted)';

  return (
    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
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
      <span className="text-[7px] font-mono text-[var(--hint)] tracking-wider">%</span>
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
    <svg viewBox="0 0 184 184" width="188" height="188" aria-label="Koku çarkı">
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
    { label: 'Kalıcılık', value: longevity, tone: '#fbbf24', glow: '0 0 8px rgba(251,191,36,0.6)', note: longevity >= 80 ? 'Çok kalıcı' : longevity >= 60 ? 'Dengeli' : 'Hafif' },
    { label: 'Yayılım', value: projection, tone: '#2dd4bf', glow: '0 0 8px rgba(45,212,191,0.6)', note: projection >= 80 ? 'Güçlü' : projection >= 60 ? 'Orta' : 'Yakın ten' },
    { label: 'Uyum Skoru', value: fit, tone: '#fbbf24', glow: '0 0 8px rgba(251,191,36,0.6)', note: fit >= 85 ? 'Çok yüksek' : fit >= 70 ? 'Yüksek' : 'Seçici' },
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
