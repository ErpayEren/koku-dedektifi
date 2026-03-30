'use client';

import { useMemo, useState } from 'react';

interface MoleculeVisualProps {
  name: string;
  smiles?: string;
  formula?: string;
  className?: string;
  compact?: boolean;
}

function buildPubChemUrl(name: string, smiles?: string): string {
  const imageSize = 'large';
  if (smiles && smiles.trim()) {
    return `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles.trim())}/PNG?image_size=${imageSize}`;
  }
  return `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name.trim())}/PNG?image_size=${imageSize}`;
}

function monogram(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function MoleculeVisual({ name, smiles, formula, className = '', compact = false }: MoleculeVisualProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const src = useMemo(() => buildPubChemUrl(name, smiles), [name, smiles]);

  return (
    <div
      className={`relative overflow-hidden rounded-[26px] border bg-[#0b0a0e] ${className}`}
      style={{
        borderColor: 'var(--gold-line)',
        backgroundImage:
          'radial-gradient(circle at 50% 42%, rgba(201,169,110,.1) 0%, rgba(201,169,110,.025) 32%, transparent 72%)',
      }}
    >
      <div className="pointer-events-none absolute inset-x-10 top-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,.03),transparent_58%)]" />

      {!imageFailed ? (
        <img
          src={src}
          alt={`${name} molekul yapisi`}
          loading="lazy"
          decoding="async"
          crossOrigin="anonymous"
          onError={() => setImageFailed(true)}
          className={`relative z-[1] mx-auto w-full object-contain px-8 py-6 ${compact ? 'h-[168px]' : 'h-[228px]'}`}
        />
      ) : (
        <div className={`relative z-[1] flex flex-col items-center justify-center px-8 py-6 text-center ${compact ? 'h-[168px]' : 'h-[228px]'}`}>
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)] text-[22px] font-mono text-gold">
            {monogram(name)}
          </div>
          <p className="text-[11px] font-mono uppercase tracking-[.18em] text-[var(--muted)]">Molekul Yapisi</p>
          <p className="mt-2 text-[13px] text-cream/90">Harici cizim su an yuklenemedi.</p>
          {formula ? <p className="mt-1 text-[12px] font-mono text-gold/80">{formula}</p> : null}
        </div>
      )}
    </div>
  );
}
