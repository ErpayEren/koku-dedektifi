'use client';

import { useEffect, useMemo, useState } from 'react';
import { UI } from '@/lib/strings';
import type { AnalysisResult, MoleculeItem } from '@/lib/client/types';
import { Card } from './ui/Card';
import { CardTitle } from './ui/CardTitle';
import { SectionDivider } from './ui/SectionDivider';
import { ScentGlyph } from './ui/ScentGlyph';

interface AnalysisResultsProps {
  result: AnalysisResult | null;
  isAnalyzing: boolean;
  onAnalyzeSimilar: (name: string) => void;
}

function toList(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const text = typeof item === 'string' ? item.trim() : '';
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= max) break;
  }
  return out;
}

function clampPercent(value: unknown, fallback = 50): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function formatPersonaAge(age: unknown): string {
  const raw = typeof age === 'string' ? age.trim() : '';
  if (!raw) return 'Genis kullanici profili';
  if (raw.includes('+') || raw.includes('-')) return 'Yas esnek, deneyim odakli';
  return raw;
}

function sanitizeMolecules(value: unknown): MoleculeItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const name = typeof row.name === 'string' ? row.name.trim() : '';
      if (!name) return null;
      return {
        name,
        smiles: typeof row.smiles === 'string' ? row.smiles : '',
        formula: typeof row.formula === 'string' ? row.formula : '',
        family: typeof row.family === 'string' ? row.family : '',
        origin: typeof row.origin === 'string' ? row.origin : '',
        note: typeof row.note === 'string' ? row.note : '',
        contribution: typeof row.contribution === 'string' ? row.contribution : '',
      };
    })
    .filter((item): item is MoleculeItem => Boolean(item));
}

export function AnalysisResults({ result, isAnalyzing, onAnalyzeSimilar }: AnalysisResultsProps) {
  const [moleculeIndex, setMoleculeIndex] = useState(0);

  useEffect(() => {
    setMoleculeIndex(0);
  }, [result?.id]);

  if (isAnalyzing) {
    return (
      <section className="px-5 md:px-12 pb-8 anim-up-1">
        <SectionDivider label="Analiz Isleniyor" />
        <Card className="p-8 md:p-10">
          <div className="mb-6">
            <p className="font-display italic text-[1.9rem] md:text-[2.1rem] text-cream mb-1">{UI.analyzing}</p>
            <p className="text-[12px] text-muted">{UI.analysisSteps}</p>
          </div>

          <div className="space-y-4">
            <div className="skeleton-track h-[12px] rounded-full" />
            <div className="skeleton-track h-[12px] rounded-full" />
            <div className="skeleton-track h-[12px] rounded-full" />
          </div>
        </Card>
      </section>
    );
  }

  if (!result) return null;

  const season = toList(result.season, 6);
  const similar = toList(result.similar, 10);
  const dupes = toList(result.dupes, 8);
  const molecules = sanitizeMolecules(result.molecules);
  const moleculeSafeIndex = Math.max(0, Math.min(moleculeIndex, Math.max(0, molecules.length - 1)));
  const molecule = molecules[moleculeSafeIndex] || null;

  const occasionList = toList(result.persona?.occasions, 5);
  const scores = {
    freshness: clampPercent(result.scores?.freshness, 50),
    sweetness: clampPercent(result.scores?.sweetness, 50),
    warmth: clampPercent(result.scores?.warmth, 50),
  };
  const intensity = clampPercent(result.intensity, 65);
  const wheelValues = [scores.freshness, scores.sweetness, scores.warmth, intensity];

  return (
    <section className="px-5 md:px-12 pb-8 anim-up-2">
      <SectionDivider label="Analiz Sonucu" />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-5 mb-5">
        <Card className="p-7 md:p-9 hover-lift" glow>
          <CardTitle>{UI.detectedScent}</CardTitle>
          <div className="flex items-start gap-4">
            <ScentGlyph token={result.iconToken} size={64} className="inline-flex items-center justify-center rounded-2xl border border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold" />
            <div className="flex-1 min-w-0">
              <h2 className="font-display italic text-[2rem] md:text-[2.35rem] leading-[1.05] text-cream">
                {result.name}
              </h2>
              <p className="text-[11px] font-mono uppercase tracking-[.1em] text-gold mt-2">
                {result.family || 'Aromatik'}
              </p>
            </div>
          </div>

          <div className="mt-7">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-[.1em] text-muted">Yogunluk</span>
              <span className="text-[12px] text-cream">{intensity}%</span>
            </div>
            <div className="h-[6px] rounded-full bg-white/[.08] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#9f4f64] via-[#d97568] to-[#f08f66] transition-all duration-500 ease-out"
                style={{ width: `${intensity}%` }}
              />
            </div>
          </div>

          <div className="mt-7 pt-6 border-t border-white/[.06]">
            <CardTitle>{UI.scentDescription}</CardTitle>
            <p className="text-[15px] leading-relaxed text-cream/95">{result.description || 'Aciklama su an hazir degil.'}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {season.map((tag) => (
                <span key={tag} className="text-[10px] font-mono px-2.5 py-1.5 rounded-full border border-white/[.08] text-muted">
                  {tag}
                </span>
              ))}
              {result.occasion ? (
                <span className="text-[10px] font-mono px-2.5 py-1.5 rounded-full border border-[var(--gold-line)] text-gold">
                  {result.occasion}
                </span>
              ) : null}
            </div>
          </div>
        </Card>

        <Card className="p-6 hover-lift">
          <CardTitle>{UI.pyramid}</CardTitle>
          <div className="space-y-4">
            <PyramidRow label={UI.topNote} items={toList(result.pyramid?.top, 6)} />
            <PyramidRow label={UI.heartNote} items={toList(result.pyramid?.middle, 8)} />
            <PyramidRow label={UI.baseNote} items={toList(result.pyramid?.base, 8)} />
          </div>

          <div className="mt-7 pt-6 border-t border-white/[.06]">
            <CardTitle>{UI.suitability}</CardTitle>
            {result.persona ? (
              <div className="space-y-2 text-[12px] text-muted">
                <InfoLine label="Profil tonu" value={result.persona.vibe || 'Dengeli'} />
                <InfoLine label="Kullanim" value={occasionList.join(', ') || result.occasion || 'Genel'} />
                <InfoLine label="Stil" value={result.persona.gender || 'Unisex'} />
                <InfoLine label="Profil" value={formatPersonaAge(result.persona.age)} />
              </div>
            ) : (
              <p className="text-[12px] text-muted">Bu kokuda persona sinyali sinirli; genel kullaniciya hitap ediyor.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-6 hover-lift">
          <CardTitle className="mb-4">{UI.keyMolecules}</CardTitle>
          {molecule ? (
            <div>
              <div className="rounded-xl border border-white/[.08] bg-[#0c0b10] p-5 overflow-hidden">
                <MoleculeSketch seed={molecule.name} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setMoleculeIndex((prev) => Math.max(0, prev - 1))}
                  className="icon-btn"
                  disabled={moleculeSafeIndex === 0}
                  aria-label="Onceki molekul"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M8.8 2.3 4.2 7l4.6 4.7" />
                  </svg>
                </button>
                <div className="text-center min-w-0">
                  <p className="font-display text-[2rem] italic text-cream leading-none">{molecule.name}</p>
                  <p className="text-[12px] text-muted">{molecule.formula || 'Formul bulunamadi'}</p>
                  <p className="text-[11px] text-sage mt-1">{molecule.family || 'Molekul ailesi'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMoleculeIndex((prev) => Math.min(molecules.length - 1, prev + 1))}
                  className="icon-btn"
                  disabled={moleculeSafeIndex >= molecules.length - 1}
                  aria-label="Sonraki molekul"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M5.2 2.3 9.8 7l-4.6 4.7" />
                  </svg>
                </button>
              </div>

              {molecules.length > 1 ? (
                <div className="mt-3 flex items-center justify-center gap-2">
                  {molecules.map((item, index) => (
                    <button
                      key={`${item.name}-${index}`}
                      type="button"
                      onClick={() => setMoleculeIndex(index)}
                      className={`h-1.5 rounded-full transition-all ${index === moleculeSafeIndex ? 'w-8 bg-gold' : 'w-1.5 bg-white/[.25]'}`}
                      aria-label={`${index + 1}. molekule git`}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-[12px] text-muted">Molekul verisi bu analizde bulunamadi.</p>
          )}
        </Card>

        <Card className="p-6 hover-lift">
          <CardTitle>{UI.similarScents}</CardTitle>
          <div className="flex flex-col gap-2">
            {similar.length > 0 ? (
              similar.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onAnalyzeSimilar(item)}
                  className="group text-left w-full px-3.5 py-3 rounded-xl border border-white/[.08]
                             hover:border-[var(--gold-line)] hover:bg-[var(--gold-dim)] transition-all"
                >
                  <span className="text-[14px] text-cream">{item}</span>
                  <span className="text-[11px] text-muted block mt-1 group-hover:text-cream/80">
                    Tek dokunusla bu profile yeniden analiz calistir
                  </span>
                </button>
              ))
            ) : (
              <p className="text-[12px] text-muted">Bu koku icin benzer profil onerisi cikmadi.</p>
            )}
          </div>

          {dupes.length > 0 ? (
            <div className="mt-5 pt-5 border-t border-white/[.06]">
              <CardTitle className="mb-3">Benzer Profil Alternatifleri</CardTitle>
              <div className="flex flex-wrap gap-2">
                {dupes.map((item) => (
                  <span key={item} className="text-[10px] px-2.5 py-1.5 rounded-full border border-[var(--gold-line)] text-gold">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="p-6 hover-lift">
          <CardTitle>{UI.wheel}</CardTitle>
          <div className="flex items-center justify-center py-3">
            <RadarWheel values={wheelValues} />
          </div>
          <div className="space-y-3 mt-2">
            <ProgressMini label="Tazelik" value={scores.freshness} color="bg-sage" />
            <ProgressMini label="Tatlilik" value={scores.sweetness} color="bg-[#d58ebb]" />
            <ProgressMini label="Sicaklik" value={scores.warmth} color="bg-[#d3a36a]" />
          </div>
        </Card>
      </div>
    </section>
  );
}

function PyramidRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-white/[.06] p-3.5">
      <p className="text-[10px] uppercase tracking-[.1em] font-mono text-muted mb-1.5">{label}</p>
      <p className="text-[13px] text-cream/95 leading-relaxed">{items.length > 0 ? items.join(' • ') : 'Veri sinirli'}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[.05] pb-2">
      <span className="text-hint uppercase text-[10px] tracking-[.1em] font-mono">{label}</span>
      <span className="text-cream text-right">{value}</span>
    </div>
  );
}

function ProgressMini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[11px] text-muted">{label}</span>
        <span className="text-[11px] text-cream">{value}</span>
      </div>
      <div className="h-[6px] bg-white/[.08] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ease-out ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function RadarWheel({ values }: { values: number[] }) {
  const points = useMemo(() => {
    const center = 90;
    const radius = 64;
    const steps = values.length || 4;
    return values
      .map((value, index) => {
        const angle = -Math.PI / 2 + ((Math.PI * 2) / steps) * index;
        const ratio = Math.max(0, Math.min(1, Number(value) / 100));
        const x = center + Math.cos(angle) * radius * ratio;
        const y = center + Math.sin(angle) * radius * ratio;
        return `${x},${y}`;
      })
      .join(' ');
  }, [values]);

  return (
    <svg viewBox="0 0 180 180" width="170" height="170" aria-label="Koku carki">
      <circle cx="90" cy="90" r="64" fill="transparent" stroke="rgba(255,255,255,.12)" />
      <circle cx="90" cy="90" r="48" fill="transparent" stroke="rgba(255,255,255,.08)" />
      <circle cx="90" cy="90" r="32" fill="transparent" stroke="rgba(255,255,255,.06)" />
      <line x1="90" y1="26" x2="90" y2="154" stroke="rgba(255,255,255,.08)" />
      <line x1="26" y1="90" x2="154" y2="90" stroke="rgba(255,255,255,.08)" />
      <polygon points={points} fill="rgba(201,169,110,.22)" stroke="rgba(201,169,110,.64)" strokeWidth="1.4" />
    </svg>
  );
}

function MoleculeSketch({ seed }: { seed: string }) {
  const chars = Array.from(seed).slice(0, 8);
  return (
    <svg viewBox="0 0 300 140" width="100%" height="140" aria-label="Molekul cizimi">
      {chars.map((char, index) => {
        const x = 20 + index * 36;
        const y = 70 + (index % 2 === 0 ? -14 : 14);
        return (
          <g key={`${char}-${x}`}>
            {index > 0 ? (
              <line
                x1={x - 36}
                y1={70 + ((index - 1) % 2 === 0 ? -14 : 14)}
                x2={x}
                y2={y}
                stroke="rgba(201,169,110,.65)"
                strokeWidth="2"
              />
            ) : null}
            <circle cx={x} cy={y} r="11" fill="rgba(9,8,10,.82)" stroke="rgba(201,169,110,.6)" />
            <text x={x} y={y + 3} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill="#E8DFC9">
              {char.toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
