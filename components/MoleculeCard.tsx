'use client';

import { useEffect, useState } from 'react';

export interface MoleculeData {
  name: string;
  formula: string;
  type: string;
  note: 'top' | 'heart' | 'base';
  origin: string[];
  pct: number;
  smiles?: string;
  svgPath?: string;
}

interface MoleculeCardProps {
  molecules: MoleculeData[];
  initialIndex?: number;
  onClose: () => void;
}

const NOTE_COLORS: Record<MoleculeData['note'], string> = {
  top: 'var(--gold)',
  heart: '#a78bfa',
  base: 'var(--sage)',
};

const NOTE_LABELS: Record<MoleculeData['note'], string> = {
  top: 'Ilk Bugu Notasi',
  heart: 'Kalp Nota',
  base: 'Baz Nota',
};

function FallbackMoleculeViz({ name, color }: { name: string; color: string }) {
  const seed = name.charCodeAt(0) + name.charCodeAt(Math.max(0, name.length - 1));
  const cx = 150;
  const cy = 120;
  const nodes = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const r = 50 + ((seed * (i + 1)) % 30);
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      r: 4 + (i % 3) * 2,
    };
  });

  return (
    <svg viewBox="0 0 300 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {nodes.map((node, i) => (
        <line
          key={`center-${i}`}
          x1={cx}
          y1={cy}
          x2={node.x}
          y2={node.y}
          stroke={color}
          strokeWidth=".8"
          strokeOpacity=".4"
          strokeDasharray={i % 2 === 0 ? 'none' : '4 2'}
        />
      ))}
      {nodes.map((node, i) => {
        const next = nodes[(i + 1) % nodes.length];
        return (
          <line
            key={`edge-${i}`}
            x1={node.x}
            y1={node.y}
            x2={next.x}
            y2={next.y}
            stroke={color}
            strokeWidth=".6"
            strokeOpacity=".25"
          />
        );
      })}
      {nodes.map((node, i) => (
        <g key={`node-${i}`}>
          <circle cx={node.x} cy={node.y} r={node.r + 4} fill={color} fillOpacity=".06" />
          <circle cx={node.x} cy={node.y} r={node.r} fill={color} fillOpacity=".35" stroke={color} strokeWidth=".8" strokeOpacity=".6" />
        </g>
      ))}
      <circle cx={cx} cy={cy} r={8} fill={color} fillOpacity=".5" stroke={color} strokeWidth="1" />
      <circle cx={cx} cy={cy} r={16} fill={color} fillOpacity=".06" stroke={color} strokeWidth=".5" strokeOpacity=".3" strokeDasharray="3 2" />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="7" fontFamily="var(--font-mono)" fill={color} fillOpacity=".7">
        C
      </text>
    </svg>
  );
}

export function MoleculeCard({ molecules, initialIndex = 0, onClose }: MoleculeCardProps) {
  const [idx, setIdx] = useState(Math.max(0, Math.min(initialIndex, Math.max(0, molecules.length - 1))));

  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (molecules.length === 0) return null;

  const total = molecules.length;
  const mol = molecules[idx] ?? molecules[0];
  const color = NOTE_COLORS[mol.note];

  const prev = () => setIdx((value) => (value - 1 + total) % total);
  const next = () => setIdx((value) => (value + 1) % total);

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(9,8,10,.7)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                   w-[min(380px,90vw)] rounded-2xl overflow-hidden border anim-up"
        style={{
          background: 'var(--bg-card)',
          borderColor: `${color}33`,
          boxShadow: `0 0 60px ${color}18, 0 24px 60px rgba(0,0,0,.5)`,
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`${mol.name} molekul detayi`}
      >
        <div
          className="relative h-52 flex items-center justify-center overflow-hidden"
          style={{ background: `radial-gradient(ellipse at center, ${color}08 0%, transparent 70%)` }}
        >
          {mol.svgPath ? (
            <div className="w-full h-full flex items-center justify-center p-4" dangerouslySetInnerHTML={{ __html: mol.svgPath }} />
          ) : (
            <FallbackMoleculeViz name={mol.name} color={color} />
          )}

          {total > 1 ? (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150"
                style={{ background: 'var(--bg-raise)', border: '1px solid var(--border-md)', color: 'var(--muted)' }}
                aria-label="Onceki molekul"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M7.5 2L4 6l3.5 4" />
                </svg>
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150"
                style={{ background: 'var(--bg-raise)', border: '1px solid var(--border-md)', color: 'var(--muted)' }}
                aria-label="Sonraki molekul"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4.5 2L8 6l-3.5 4" />
                </svg>
              </button>
            </>
          ) : null}

          <div className="absolute bottom-2 right-3 font-mono text-[9px] tracking-wider" style={{ color: 'var(--hint)' }}>
            {idx + 1}/{total}
          </div>
        </div>

        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span
              className="text-[9px] font-mono tracking-[.1em] uppercase px-2 py-1 rounded"
              style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}
            >
              {NOTE_LABELS[mol.note]}
            </span>
            {mol.smiles ? (
              <span
                className="text-[9px] font-mono tracking-[.08em] uppercase px-2 py-1 rounded"
                style={{ color: 'var(--sage)', background: 'var(--sage-dim)', border: '1px solid rgba(126,184,164,.2)' }}
              >
                SMILES hazir
              </span>
            ) : null}
          </div>

          <div>
            <h3 className="font-display italic text-2xl text-[var(--cream)] leading-tight">{mol.name}</h3>
            <p className="font-mono text-sm mt-1" style={{ color }}>
              {mol.formula || 'Formul sinirli'}
            </p>
          </div>

          <p className="font-mono text-xs tracking-wider" style={{ color: 'var(--muted)' }}>
            {mol.type}
          </p>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-md)' }}>
              <div className="h-full rounded-full transition-all duration-500 mol-bar" style={{ width: `${mol.pct}%`, background: color }} />
            </div>
            <span className="font-mono text-[11px]" style={{ color }}>
              {mol.pct}%
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {mol.origin.map((origin) => (
              <span
                key={origin}
                className="text-[11px] font-mono px-3 py-1.5 rounded-full"
                style={{ color: 'var(--cream)', background: 'var(--bg-raise)', border: '1px solid var(--border-md)' }}
              >
                Orijin: {origin}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'var(--bg-raise)', color: 'var(--muted)' }}
          aria-label="Kapat"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 1l8 8M9 1L1 9" />
          </svg>
        </button>
      </div>
    </>
  );
}

