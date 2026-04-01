'use client';

import Link from 'next/link';
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
  slug?: string;
  casNumber?: string;
  profileTags?: string[];
  funFact?: string;
  explanation?: string;
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
  top: 'Üst nota izi',
  heart: 'Kalp notası izi',
  base: 'Derin iz',
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
  const molecule = molecules[idx] ?? molecules[0];
  const color = NOTE_COLORS[molecule.note];

  const prev = () => setIdx((value) => (value - 1 + total) % total);
  const next = () => setIdx((value) => (value + 1) % total);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/75 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label={`${molecule.name} molekül detayı`}
      >
        <div
          className="relative w-full max-w-[720px] max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[30px] border anim-up sm:max-h-[calc(100vh-3rem)]"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,.025) 0%, rgba(255,255,255,.01) 100%), var(--bg-card)',
            borderColor: `${color}36`,
            boxShadow: `0 0 60px ${color}18, 0 24px 60px rgba(0,0,0,.52)`,
          }}
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/[.08] bg-[var(--bg-raise)] text-muted transition-all hover:border-[var(--gold-line)] hover:text-cream"
            aria-label="Kapat"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1l8 8M9 1 1 9" />
            </svg>
          </button>

          <div className="px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
            <MoleculeVisual
              name={molecule.name}
              smiles={molecule.smiles}
              formula={molecule.formula}
              compact
              className="min-h-[260px] sm:min-h-[320px]"
            />
          </div>

          <div className="border-t border-white/[.06] px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <div className="mb-4 flex flex-wrap items-center gap-2 pr-12">
              <span
                className="rounded-full px-3 py-1 text-[10px] font-mono uppercase tracking-[.12em]"
                style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}
              >
                {NOTE_LABELS[molecule.note]}
              </span>
              <span className="rounded-full border border-white/[.08] px-3 py-1 text-[10px] font-mono uppercase tracking-[.12em] text-muted">
                {molecule.verified ? 'Doğrulanmış yapı' : 'Nota izi'}
              </span>
              {molecule.casNumber ? (
                <span className="rounded-full border border-white/[.08] px-3 py-1 text-[10px] font-mono uppercase tracking-[.12em] text-muted">
                  CAS {molecule.casNumber}
                </span>
              ) : null}
            </div>

            {total > 1 ? (
              <div className="mb-4 grid grid-cols-[44px_minmax(0,1fr)_44px] items-start gap-3">
                <button
                  onClick={prev}
                  className="icon-btn mt-2 justify-self-start"
                  aria-label="Önceki molekül"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M7.5 2 4 6l3.5 4" />
                  </svg>
                </button>
                <div className="min-w-0 text-center">
                  <h3 className="break-words text-[clamp(1.9rem,5vw,3.4rem)] font-semibold leading-[0.94] text-cream">
                    {molecule.name}
                  </h3>
                  <p className="mt-2 break-words text-[13px] font-mono text-gold/85">
                    {molecule.formula || 'Formül doğrulaması bekleniyor'}
                  </p>
                  <p className="mt-3 text-[12px] uppercase tracking-[.12em] text-muted">{molecule.type}</p>
                </div>
                <button
                  onClick={next}
                  className="icon-btn mt-2 justify-self-end"
                  aria-label="Sonraki molekül"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4.5 2 8 6l-3.5 4" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="mb-4">
                <h3 className="break-words text-[clamp(1.9rem,5vw,3.4rem)] font-semibold leading-[0.94] text-cream">
                  {molecule.name}
                </h3>
                <p className="mt-2 break-words text-[13px] font-mono text-gold/85">
                  {molecule.formula || 'Formül doğrulaması bekleniyor'}
                </p>
                <p className="mt-3 text-[12px] uppercase tracking-[.12em] text-muted">{molecule.type}</p>
              </div>
            )}

            {molecule.explanation ? (
              <div className="mb-4 rounded-2xl border border-white/[.08] bg-[var(--bg-raise)] px-3.5 py-3">
                <p className="text-[10px] font-mono uppercase tracking-[.12em] text-gold/80">
                  Bu molekül neden önemli?
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-cream/92">{molecule.explanation}</p>
              </div>
            ) : null}

            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[10px] font-mono uppercase tracking-[.12em] text-muted">
                  Kompozisyona katkısı
                </span>
                <span className="text-[12px] font-mono" style={{ color }}>
                  {molecule.pct}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[.08]">
                <div className="mol-bar h-full rounded-full" style={{ width: `${molecule.pct}%`, background: color }} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {molecule.origin.map((origin) => (
                <span
                  key={origin}
                  className="rounded-full border border-white/[.08] bg-[var(--bg-raise)] px-3 py-1.5 text-[11px] font-mono text-cream/90"
                >
                  {origin}
                </span>
              ))}
              {molecule.profileTags?.map((tag) => (
                <span
                  key={`${molecule.name}-${tag}`}
                  className="rounded-full border border-sage/25 bg-sage/10 px-3 py-1.5 text-[11px] font-mono text-sage"
                >
                  {tag}
                </span>
              ))}
            </div>

            {molecule.funFact ? (
              <div className="mt-4 rounded-2xl border border-white/[.08] bg-black/10 px-3.5 py-3">
                <p className="text-[10px] font-mono uppercase tracking-[.12em] text-muted">Biliyor muydun?</p>
                <p className="mt-2 text-[13px] leading-relaxed text-cream/88">{molecule.funFact}</p>
              </div>
            ) : null}

            {molecule.slug ? (
              <div className="mt-4 flex items-center justify-end">
                <Link
                  href={`/molekuller/${molecule.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)]/15 px-3.5 py-2 text-[10px] font-mono uppercase tracking-[.14em] text-gold transition-colors hover:bg-[var(--gold-dim)]/25"
                >
                  Detay sayfasını aç
                </Link>
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-center gap-2">
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
          </div>
        </div>
      </div>
    </>
  );
}
