'use client';

import { toPng } from 'html-to-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { UI } from '@/lib/strings';
import type { AnalysisResult, MoleculeItem } from '@/lib/client/types';
import { Card } from './ui/Card';
import { CardTitle } from './ui/CardTitle';
import { SectionDivider } from './ui/SectionDivider';
import { ScentGlyph } from './ui/ScentGlyph';
import { ScentTimeline } from './ScentTimeline';
import { MoleculeCard, type MoleculeData } from './MoleculeCard';

interface AnalysisResultsProps {
  result: AnalysisResult | null;
  isAnalyzing: boolean;
  onAnalyzeSimilar: (name: string) => void;
}

interface SimilarItem {
  name: string;
  similarity: number;
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
  if (!raw) return 'Genis profil';
  if (raw.includes('+') || raw.includes('-')) return `${raw} odakli profil`;
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

function normalizeMoleculeNote(note: string, index: number, total: number): MoleculeData['note'] {
  const text = note.toLowerCase();
  if (text.includes('top') || text.includes('ust') || text.includes('ilk')) return 'top';
  if (text.includes('heart') || text.includes('kalp') || text.includes('middle') || text.includes('orta')) return 'heart';
  if (text.includes('base') || text.includes('baz') || text.includes('alt') || text.includes('dry')) return 'base';
  if (index === 0) return 'top';
  if (index >= Math.max(1, total - 2)) return 'base';
  return 'heart';
}

function parseContributionPct(value: string, index: number, total: number): number {
  const match = value.match(/(\d{1,3})/);
  if (match) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed)) return clampPercent(parsed, 0);
  }
  const fallback = 72 - index * Math.max(8, Math.floor(48 / Math.max(2, total)));
  return clampPercent(fallback, 50);
}

function resolveMoleculeType(family: string): string {
  return family.trim() || 'Aromatik Bilesik';
}

function resolveMoleculeOrigin(origin: string): string[] {
  const list = origin
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length > 0 ? list.slice(0, 4) : ['Dogal profil'];
}

function toMoleculeData(molecules: MoleculeItem[]): MoleculeData[] {
  return molecules.map((item, index) => ({
    name: item.name,
    formula: item.formula || '',
    type: resolveMoleculeType(item.family),
    note: normalizeMoleculeNote(item.note, index, molecules.length),
    origin: resolveMoleculeOrigin(item.origin),
    pct: parseContributionPct(item.contribution, index, molecules.length),
    smiles: item.smiles || undefined,
  }));
}

function buildSimilarItems(values: string[]): SimilarItem[] {
  return values.map((raw, index) => {
    const label = String(raw || '').trim();
    const pctMatch = label.match(/(\d{1,3})\s*%/);
    const similarity = pctMatch ? clampPercent(Number(pctMatch[1]), 75) : clampPercent(96 - index * 4, 70);
    const clean = pctMatch ? label.replace(/\(?\s*\d{1,3}\s*%\s*\)?/g, '').trim() : label;
    return {
      name: clean || label || `Benzer profil ${index + 1}`,
      similarity,
    };
  });
}

function resolveConfidence(result: AnalysisResult): number {
  const value = (result as AnalysisResult & { confidence?: number }).confidence;
  return clampPercent(value, 87);
}

function noteColor(note: MoleculeData['note']): string {
  if (note === 'top') return 'var(--gold)';
  if (note === 'heart') return '#a78bfa';
  return 'var(--sage)';
}

const FAMILY_GLOW: Record<string, string> = {
  'Aromatik Fougere': 'rgba(126,184,164,.08)',
  Oryantal: 'rgba(201,169,110,.1)',
  Floral: 'rgba(200,140,180,.08)',
  Fresh: 'rgba(90,180,200,.08)',
  Woody: 'rgba(160,130,100,.08)',
  Chypre: 'rgba(126,184,164,.08)',
};

export function AnalysisResults({ result, isAnalyzing, onAnalyzeSimilar }: AnalysisResultsProps) {
  const [moleculeIndex, setMoleculeIndex] = useState(0);
  const [molCardIdx, setMolCardIdx] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [barsReady, setBarsReady] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const shareCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMoleculeIndex(0);
    setMolCardIdx(null);
  }, [result?.id]);

  useEffect(() => {
    if (!result) {
      setVisible(false);
      return;
    }
    setVisible(false);
    const timer = window.setTimeout(() => setVisible(true), 50);
    return () => window.clearTimeout(timer);
  }, [result?.id, result]);

  useEffect(() => {
    if (!result) {
      setBarsReady(false);
      return;
    }
    setBarsReady(false);
    const timer = window.setTimeout(() => setBarsReady(true), 60);
    return () => window.clearTimeout(timer);
  }, [result?.id, result]);

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

  const activeResult = result;

  const season = toList(activeResult.season, 6);
  const similar = toList(activeResult.similar, 10);
  const similarItems = buildSimilarItems(similar);
  const dupes = toList(activeResult.dupes, 8);
  const molecules = sanitizeMolecules(activeResult.molecules);
  const moleculeData = toMoleculeData(molecules);
  const moleculeSafeIndex = Math.max(0, Math.min(moleculeIndex, Math.max(0, moleculeData.length - 1)));
  const molecule = moleculeData[moleculeSafeIndex] || null;
  const occasionList = toList(activeResult.persona?.occasions, 5);
  const scores = {
    freshness: clampPercent(activeResult.scores?.freshness, 50),
    sweetness: clampPercent(activeResult.scores?.sweetness, 50),
    warmth: clampPercent(activeResult.scores?.warmth, 50),
  };
  const intensity = clampPercent(activeResult.intensity, 65);
  const wheelValues = [scores.freshness, scores.sweetness, scores.warmth, intensity];
  const confidence = resolveConfidence(activeResult);
  const heartNotes = activeResult.pyramid?.middle ?? [];
  const glowColor = FAMILY_GLOW[activeResult.family] ?? 'rgba(201,169,110,.06)';

  const cardMotion = (index: number) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(12px)',
    transition: `opacity .4s ease ${index * 80}ms, transform .4s var(--ease) ${index * 80}ms`,
  });

  async function shareResultCard(): Promise<void> {
    if (!shareCardRef.current || shareBusy) return;
    setShareBusy(true);
    try {
      const dataUrl = await toPng(shareCardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#09080a',
      });
      const blob = await fetch(dataUrl).then((response) => response.blob());
      const file = new File([blob], `${activeResult.name.toLowerCase().replace(/\s+/g, '-')}.png`, {
        type: 'image/png',
      });
      const supportsFiles =
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        (typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] }));

      if (supportsFiles) {
        await navigator.share({
          title: activeResult.name,
          files: [file],
        });
      } else {
        const downloadUrl = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = downloadUrl;
        anchor.download = file.name;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      console.error('[analysis-results] share failed.', error);
    } finally {
      setShareBusy(false);
    }
  }

  return (
    <section className="px-5 md:px-12 pb-8 anim-up-2">
      <SectionDivider label="Analiz Sonucu" />

      <div ref={shareCardRef} className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-5 mb-5">
        <Card
          className="p-7 md:p-9 hover-lift relative overflow-hidden"
          glow
          style={{
            ...cardMotion(0),
            backgroundImage: `radial-gradient(ellipse at top right, ${glowColor} 0%, transparent 60%)`,
          }}
        >
          <div className="absolute top-5 right-5">
            <ConfidenceRing pct={confidence} />
          </div>
          <div className="absolute top-5 left-5">
            <button
              type="button"
              onClick={() => void shareResultCard()}
              disabled={shareBusy}
              className="rounded-full border border-white/[.08] bg-black/20 px-3 py-2 text-[10px] font-mono uppercase tracking-[.08em] text-muted hover:text-cream hover:border-[var(--gold-line)] transition-colors disabled:opacity-50"
            >
              {shareBusy ? 'Paylasiliyor' : 'Paylas'}
            </button>
          </div>
          <CardTitle>{UI.detectedScent}</CardTitle>
          <div className="flex items-start gap-4 pr-20">
            <ScentGlyph
              token={result.iconToken}
              size={64}
              className="inline-flex items-center justify-center rounded-2xl border border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold"
            />
            <div className="flex-1 min-w-0">
              <h2 className="font-display italic text-[2rem] md:text-[2.35rem] leading-[1.05] text-cream">{result.name}</h2>
              <p className="text-[11px] font-mono uppercase tracking-[.1em] text-gold mt-2">{result.family || 'Aromatik'}</p>
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
                <span className="text-[10px] font-mono px-2.5 py-1.5 rounded-full border border-[var(--gold-line)] text-gold">{result.occasion}</span>
              ) : null}
            </div>
          </div>
        </Card>

        <Card className="p-6 hover-lift" style={cardMotion(1)}>
          <CardTitle>{UI.pyramid}</CardTitle>
          <div className="space-y-4">
            <PyramidRow label={UI.topNote} items={toList(result.pyramid?.top, 6)} />
            <PyramidRow label={UI.heartNote} items={toList(heartNotes, 8)} />
            <PyramidRow label={UI.baseNote} items={toList(result.pyramid?.base, 8)} />
          </div>

          <div className="mt-6 border-t pt-6" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[9px] font-mono tracking-[.14em] uppercase mb-4" style={{ color: 'var(--muted)' }}>
              - Koku Gelisimi
            </div>
            <ScentTimeline
              topNotes={toList(result.pyramid?.top, 6)}
              heartNotes={toList(heartNotes, 8)}
              baseNotes={toList(result.pyramid?.base, 8)}
            />
          </div>

          <div className="mt-7 pt-6 border-t border-white/[.06]">
            <CardTitle>{UI.suitability}</CardTitle>
            {result.persona ? (
              <div className="space-y-2 text-[12px] text-muted">
                <InfoLine label="Profil tonu" value={result.persona.vibe || 'Dengeli'} />
                <InfoLine label="Kullanim cercevesi" value={occasionList.join(', ') || result.occasion || 'Genel'} />
                <InfoLine label="Stil" value={result.persona.gender || 'Unisex'} />
                <InfoLine label="Yas araligi" value={formatPersonaAge(result.persona.age)} />
              </div>
            ) : (
              <p className="text-[12px] text-muted">Bu kokuda persona sinyali sinirli; genel kullaniciya hitap ediyor.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-6 hover-lift" style={cardMotion(2)}>
          <CardTitle className="mb-4">{UI.keyMolecules}</CardTitle>
          {molecule ? (
            <div>
              <button
                type="button"
                className="rounded-xl border border-white/[.08] bg-[#0c0b10] p-5 overflow-hidden w-full text-left hover:border-[var(--gold-line)] transition-colors"
                onClick={() => setMolCardIdx(moleculeSafeIndex)}
                aria-label={`${molecule.name} molekul kartini ac`}
              >
                <MoleculeSketch seed={molecule.name} />
              </button>
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
                  <p className="text-[11px] text-sage mt-1">{molecule.type || 'Molekul ailesi'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMoleculeIndex((prev) => Math.min(moleculeData.length - 1, prev + 1))}
                  className="icon-btn"
                  disabled={moleculeSafeIndex >= moleculeData.length - 1}
                  aria-label="Sonraki molekul"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M5.2 2.3 9.8 7l-4.6 4.7" />
                  </svg>
                </button>
              </div>

              {moleculeData.length > 1 ? (
                <>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    {moleculeData.map((item, index) => (
                      <button
                        key={`${item.name}-${index}`}
                        type="button"
                        onClick={() => setMoleculeIndex(index)}
                        className={`h-1.5 rounded-full transition-all ${
                          index === moleculeSafeIndex ? 'w-8 bg-gold' : 'w-1.5 bg-white/[.25]'
                        }`}
                        aria-label={`${index + 1}. molekule git`}
                      />
                    ))}
                  </div>

                  <div className="mt-4 space-y-2 max-h-[180px] overflow-auto pr-1">
                    {moleculeData.map((item, index) => {
                      const pct = clampPercent(item.pct, 50);
                      const color = noteColor(item.note);
                      return (
                        <button
                          key={`${item.name}-${index}-row`}
                          type="button"
                          onClick={() => {
                            setMoleculeIndex(index);
                            setMolCardIdx(index);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg border transition-all duration-150 ${
                            index === moleculeSafeIndex
                              ? 'border-[var(--gold-line)] bg-[var(--gold-dim)]/30'
                              : 'border-white/[.07] hover:border-[var(--gold-line)]'
                          }`}
                          aria-label={`${item.name} detayini goster`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[12px] text-cream truncate">{item.name}</span>
                            <span className="text-[11px] font-mono" style={{ color }}>
                              {pct}%
                            </span>
                          </div>
                          <div className="h-1 rounded-full bg-white/[.08] mt-2 overflow-hidden">
                            <div
                              className="h-full rounded-full mol-bar"
                              style={{
                                width: barsReady ? `${pct}%` : '0%',
                                background: color,
                                transition: 'width .8s var(--ease)',
                              }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <p className="text-[12px] text-muted">Molekul verisi bu analizde bulunamadi.</p>
          )}
        </Card>

        <Card className="p-6 hover-lift" style={cardMotion(3)}>
          <CardTitle>{UI.similarScents}</CardTitle>
          <div className="flex flex-col gap-2">
            {similarItems.length > 0 ? (
              similarItems.map((item) => (
                <button
                  key={`${item.name}-${item.similarity}`}
                  type="button"
                  onClick={() => onAnalyzeSimilar(item.name)}
                  className="similar-item text-left w-full px-3.5 py-3 rounded-xl border border-white/[.08] hover:border-[var(--gold-line)] hover:bg-[var(--gold-dim)]/45 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[14px] text-cream block truncate">{item.name}</span>
                      <span className="text-[11px] text-muted block mt-1">
                        Tek dokunusla bu profile yeniden analiz calistir
                      </span>
                    </div>
                    <SimilarityArc pct={item.similarity} />
                  </div>
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

        <Card className="p-6 hover-lift" style={cardMotion(4)}>
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

      {molCardIdx !== null ? (
        <MoleculeCard molecules={moleculeData} initialIndex={molCardIdx} onClose={() => setMolCardIdx(null)} />
      ) : null}
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

function ConfidenceRing({ pct }: { pct: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-label={`Guven skoru ${pct}`}>
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
      <span className="text-[8px] font-mono tracking-[.1em] uppercase text-[var(--muted)]">Guven</span>
    </div>
  );
}

function SimilarityArc({ pct }: { pct: number }) {
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
      <g transform="translate(90,90)">
        <path d="M0,0 L0,-80 A80,80,0,0,1,69.3,-40 Z" fill="rgba(126,184,164,.25)" stroke="rgba(126,184,164,.5)" strokeWidth=".8" className="cursor-pointer transition-all duration-150 hover:opacity-100" style={{ opacity: 0.7 }}>
          <title>Tazelik - {values[0]}%</title>
        </path>
        <path d="M0,0 L69.3,-40 A80,80,0,0,1,80,0 Z" fill="rgba(201,169,110,.2)" stroke="rgba(201,169,110,.4)" strokeWidth=".8" className="cursor-pointer transition-all duration-150 hover:opacity-100" style={{ opacity: 0.7 }}>
          <title>Odunsu - {values[2]}%</title>
        </path>
        <path d="M0,0 L80,0 A80,80,0,0,1,40,69.3 Z" fill="rgba(90,180,200,.15)" stroke="rgba(90,180,200,.35)" strokeWidth=".8" className="cursor-pointer transition-all duration-150 hover:opacity-100" style={{ opacity: 0.7 }}>
          <title>Ferahlik - {values[0]}%</title>
        </path>
        <path d="M0,0 L40,69.3 A80,80,0,0,1,-40,69.3 Z" fill="rgba(200,140,180,.15)" stroke="rgba(200,140,180,.35)" strokeWidth=".8" className="cursor-pointer transition-all duration-150 hover:opacity-100" style={{ opacity: 0.7 }}>
          <title>Tatlilik - {values[1]}%</title>
        </path>
        <path d="M0,0 L-40,69.3 A80,80,0,0,1,-80,0 A80,80,0,0,1,0,-80 Z" fill="rgba(201,169,110,.12)" stroke="rgba(201,169,110,.3)" strokeWidth=".8" className="cursor-pointer transition-all duration-150 hover:opacity-100" style={{ opacity: 0.7 }}>
          <title>Sicaklik - {values[3]}%</title>
        </path>
      </g>
      <circle cx="90" cy="90" r="64" fill="transparent" stroke="rgba(255,255,255,.12)" />
      <circle cx="90" cy="90" r="48" fill="transparent" stroke="rgba(255,255,255,.08)" />
      <circle cx="90" cy="90" r="32" fill="transparent" stroke="rgba(255,255,255,.06)" />
      <line x1="90" y1="10" x2="90" y2="170" stroke="rgba(255,255,255,.08)" />
      <line x1="10" y1="90" x2="170" y2="90" stroke="rgba(255,255,255,.08)" />
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
