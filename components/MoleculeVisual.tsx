'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface MoleculeVisualProps {
  name: string;
  smiles?: string;
  formula?: string;
  className?: string;
  compact?: boolean;
}

type RenderState = 'loading' | 'ready' | 'fallback';

function atomColor(atom: string): string {
  const normalized = atom.trim().toUpperCase();
  if (normalized === 'O') return '#e98a71';
  if (normalized === 'N') return '#8bb0ff';
  if (normalized === 'S') return '#d6ba73';
  if (normalized === 'H') return '#cbbfb4';
  return '#ddc8ab';
}

function recolorSvg(svg: SVGSVGElement): void {
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.overflow = 'visible';
  svg.style.filter = 'drop-shadow(0 10px 28px rgba(201,169,110,.08))';

  svg.querySelectorAll<SVGElement>('line, path, polygon, polyline').forEach((node) => {
    node.setAttribute('stroke', '#d6c0a2');
    node.setAttribute('stroke-width', '2.2');
    node.setAttribute('stroke-linecap', 'round');
    node.setAttribute('stroke-linejoin', 'round');
    node.setAttribute('opacity', '0.94');
  });

  svg.querySelectorAll<SVGElement>('circle, ellipse').forEach((node) => {
    const currentFill = node.getAttribute('fill');
    if (!currentFill || currentFill === '#fff' || currentFill === '#ffffff') {
      node.setAttribute('fill', '#15121a');
    }
    node.setAttribute('stroke', '#d6c0a2');
  });

  svg.querySelectorAll<SVGTextElement>('text').forEach((node) => {
    const symbol = (node.textContent || '').trim();
    node.setAttribute('fill', atomColor(symbol));
    node.style.fontFamily = 'var(--font-mono)';
    node.style.letterSpacing = '0.02em';
    node.style.fontWeight = '600';
  });
}

export function MoleculeVisual({ smiles, formula, className = '', compact = false }: MoleculeVisualProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [renderState, setRenderState] = useState<RenderState>('loading');

  const canvasHeight = compact ? 204 : 260;
  const drawSize = useMemo(
    () => ({
      width: compact ? 380 : 460,
      height: compact ? 190 : 246,
    }),
    [compact],
  );

  useEffect(() => {
    let cancelled = false;

    async function renderMolecule(): Promise<void> {
      if (!containerRef.current) return;
      containerRef.current.innerHTML = '';

      if (!smiles || !smiles.trim()) {
        setRenderState('fallback');
        return;
      }

      setRenderState('loading');

      try {
        const smilesDrawerModule = await import('smiles-drawer');
        const smilesDrawer = smilesDrawerModule.default;
        const tree = await new Promise<import('smiles-drawer').SmilesTree>((resolve, reject) => {
          smilesDrawer.parse(smiles.trim(), resolve, reject);
        });

        if (cancelled || !containerRef.current) return;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', `0 0 ${drawSize.width} ${drawSize.height}`);

        const drawer = new smilesDrawer.SvgDrawer({
          width: drawSize.width,
          height: drawSize.height,
          padding: compact ? 18 : 24,
          bondLength: compact ? 22 : 28,
          bondThickness: 1.9,
          shortBondLength: 0.84,
          explicitHydrogens: false,
          compactDrawing: true,
          terminalCarbons: false,
        });

        drawer.draw(tree, svg, 'light', false);
        recolorSvg(svg);
        containerRef.current.appendChild(svg);
        if (!cancelled) setRenderState('ready');
      } catch (error) {
        console.error('[molecule-visual] smiles render failed.', error);
        if (!cancelled) setRenderState('fallback');
      }
    }

    void renderMolecule();

    return () => {
      cancelled = true;
    };
  }, [compact, drawSize.height, drawSize.width, smiles]);

  return (
    <div
      className={`relative overflow-hidden rounded-[30px] border bg-[#0b0910] ${className}`}
      style={{
        borderColor: 'var(--gold-line)',
        backgroundImage:
          'radial-gradient(circle at 50% 34%, rgba(201,169,110,.16) 0%, rgba(201,169,110,.04) 30%, transparent 74%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)',
      }}
    >
      <div className="pointer-events-none absolute inset-x-8 top-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,.03),transparent_58%)]" />

      <div
        ref={containerRef}
        className={`relative z-[1] mx-auto flex w-full items-center justify-center px-6 transition-opacity duration-300 ${
          renderState === 'loading' ? 'opacity-60' : 'opacity-100'
        }`}
        style={{ height: `${canvasHeight}px` }}
      />

      {renderState === 'loading' ? (
        <div className="pointer-events-none absolute inset-x-10 top-1/2 h-[2px] -translate-y-1/2 shimmer-line opacity-70" />
      ) : null}

      {renderState === 'fallback' ? (
        <div
          className="absolute inset-0 z-[2] flex flex-col items-center justify-center px-8 text-center"
          style={{ height: `${canvasHeight}px` }}
        >
          <div className="mb-5 rounded-[24px] border border-[var(--gold-line)] bg-[linear-gradient(180deg,rgba(201,169,110,.1),rgba(201,169,110,.02))] p-5 shadow-[0_0_30px_rgba(201,169,110,.08)]">
            <svg width="180" height="88" viewBox="0 0 180 88" fill="none" aria-hidden="true">
              <defs>
                <radialGradient id="note-trace-core" cx="50%" cy="50%" r="65%">
                  <stop offset="0%" stopColor="rgba(201,169,110,.36)" />
                  <stop offset="100%" stopColor="rgba(201,169,110,0)" />
                </radialGradient>
              </defs>
              <ellipse cx="90" cy="44" rx="64" ry="28" fill="url(#note-trace-core)" />
              <path d="M24 52C44 26 70 20 90 44c20 24 46 18 66-10" stroke="#d6c0a2" strokeWidth="2.1" strokeLinecap="round" />
              <circle cx="24" cy="52" r="5" fill="#09080A" stroke="#d6c0a2" strokeWidth="1.6" />
              <circle cx="90" cy="44" r="6" fill="#09080A" stroke="#a78bfa" strokeWidth="1.8" />
              <circle cx="156" cy="34" r="5" fill="#09080A" stroke="#7eb8a4" strokeWidth="1.6" />
              <circle cx="58" cy="29" r="3.5" fill="#09080A" stroke="#d6c0a2" strokeWidth="1.3" />
              <circle cx="124" cy="54" r="3.5" fill="#09080A" stroke="#d6c0a2" strokeWidth="1.3" />
            </svg>
          </div>
          <p className="text-[11px] font-mono uppercase tracking-[.18em] text-[var(--muted)]">Nota izi</p>
          <p className="mt-2 text-[13px] text-cream/92">Gerçek moleküler yapı doğrulanamadığında estetik nota izi gösterilir.</p>
          {formula ? <p className="mt-2 text-[12px] font-mono text-gold/80">{formula}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
