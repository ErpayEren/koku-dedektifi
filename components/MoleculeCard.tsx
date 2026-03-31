'use client';

import { useEffect, useState } from 'react';
import { MoleculeVisual } from './MoleculeVisual';

export interface MoleculeData {
  name: string;
  formula: string;
  type: string;
  note: 'top' | 'heart' | 'base';
  origin: string[];
  pct: number;
  smiles?: string;
  verified?: boolean;
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
  top: 'Üst Nota İzi',
  heart: 'Kalp Nota İzi',
  base: 'Alt Nota İzi',
};

export function MoleculeCard({ molecules, initialIndex = 0, onClose }: MoleculeCardProps) {
  const [idx, setIdx] = useState(Math.max(0, Math.min(initialIndex, Math.max(0, molecules.length - 1))));

  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') setIdx((value) => (value - 1 + molecules.length) % molecules.length);
      if (event.key === 'ArrowRight') setIdx((value) => (value + 1) % molecules.length);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [molecules.length, onClose]);

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
        style={{ background: 'rgba(9,8,10,.76)', backdropFilter: 'blur(10px)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="fixed left-1/2 top-1/2 z-50 w-[min(420px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] border anim-up"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,.025) 0%, rgba(255,255,255,.01) 100%), var(--bg-card)',
          borderColor: `${color}33`,
          boxShadow: `0 0 60px ${color}18, 0 24px 60px rgba(0,0,0,.52)`,
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`${mol.name} molekül detayı`}
      >
        <div className="px-5 pt-5 pb-3">
          <MoleculeVisual name={mol.name} smiles={mol.smiles} formula={mol.formula} compact />
        </div>

        <div className="border-t border-white/[.06] px-5 pb-5 pt-4">
          <div className="mb-3 flex items-center gap-2">
            <span
              className="rounded-full px-3 py-1 text-[10px] font-mono uppercase tracking-[.12em]"
              style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}
            >
              {NOTE_LABELS[mol.note]}
            </span>
            <span className="rounded-full border border-white/[.08] px-3 py-1 text-[10px] font-mono uppercase tracking-[.12em] text-muted">
              {mol.verified ? 'Doğrulanmış yapı' : 'Nota izi'}
            </span>
          </div>

          <div className="mb-4">
            <h3 className="text-[2rem] font-semibold leading-none text-cream">{mol.name}</h3>
            <p className="mt-2 text-[13px] font-mono text-gold/85">{mol.formula || 'Formül doğrulanmadı'}</p>
            <p className="mt-3 text-[12px] uppercase tracking-[.12em] text-muted">{mol.type}</p>
          </div>

          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[10px] font-mono uppercase tracking-[.12em] text-muted">Katkı yoğunluğu</span>
              <span className="text-[12px] font-mono" style={{ color }}>
                {mol.pct}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[.08]">
              <div className="mol-bar h-full rounded-full" style={{ width: `${mol.pct}%`, background: color }} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {mol.origin.map((origin) => (
              <span
                key={origin}
                className="rounded-full border border-white/[.08] bg-[var(--bg-raise)] px-3 py-1.5 text-[11px] font-mono text-cream/90"
              >
                {origin}
              </span>
            ))}
          </div>
        </div>

        {total > 1 ? (
          <>
            <button
              onClick={prev}
              className="absolute left-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/[.08] bg-[var(--bg-raise)] text-muted transition-all hover:border-[var(--gold-line)] hover:text-cream"
              aria-label="Önceki molekül"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7.5 2 4 6l3.5 4" />
              </svg>
            </button>
            <button
              onClick={next}
              className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/[.08] bg-[var(--bg-raise)] text-muted transition-all hover:border-[var(--gold-line)] hover:text-cream"
              aria-label="Sonraki molekül"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4.5 2 8 6l-3.5 4" />
              </svg>
            </button>
          </>
        ) : null}

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
          {molecules.map((item, dotIndex) => (
            <button
              key={`${item.name}-${dotIndex}`}
              type="button"
              onClick={() => setIdx(dotIndex)}
              className={`h-2 rounded-full transition-all ${dotIndex === idx ? 'w-8 bg-gold' : 'w-2 bg-white/[.2]'}`}
              aria-label={`${item.name} molekülüne geç`}
            />
          ))}
        </div>

        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/[.08] bg-[var(--bg-raise)] text-muted transition-all hover:border-[var(--gold-line)] hover:text-cream"
          aria-label="Kapat"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 1l8 8M9 1 1 9" />
          </svg>
        </button>
      </div>
    </>
  );
}
