'use client';

import Link from 'next/link';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { animate, useMotionValue, useSpring } from 'framer-motion';
import { getPublicMoleculeByName } from '@/lib/catalog-public';
import { UI } from '@/lib/strings';
import type { AnalysisResult, MoleculeItem, TechnicalItem } from '@/lib/client/types';
import { Card } from './ui/Card';
import { CardTitle } from './ui/CardTitle';
import { SectionDivider } from './ui/SectionDivider';
import { ScentGlyph } from './ui/ScentGlyph';
import { ScentTimeline } from './ScentTimeline';
import { MoleculeCard, type MoleculeData } from './MoleculeCard';
import { MoleculeVisual } from './MoleculeVisual';
import { ShareAnalysisModal } from './ShareAnalysisModal';
import { getOnboardingPreferences } from '@/lib/client/storage';
import type { OnboardingPreferences } from '@/lib/client/types';
import { useBillingEntitlement } from '@/lib/client/useBillingEntitlement';

interface AnalysisResultsProps {
  result: AnalysisResult | null;
  isAnalyzing: boolean;
  onAnalyzeSimilar: (name: string) => void;
}

interface SimilarItem {
  name: string;
  similarity: number;
}

interface MoleculeLookupRow {
  smiles?: string | null;
  formula?: string;
  family?: string;
  origin?: string;
}

const MOLECULE_ACCENTS = ['#d8b06d', '#a78bfa', '#2dd4bf', '#d58ebb', '#7ecfe5'] as const;

function moleculeAccent(index: number): string {
  return MOLECULE_ACCENTS[index % MOLECULE_ACCENTS.length];
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
  return family.trim() || 'Aromatik bileşik';
}

function resolveMoleculeOrigin(origin: string): string[] {
  const list = origin
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length > 0 ? list.slice(0, 4) : ['Nota izi'];
}

function buildMoleculeExplanation(
  item: MoleculeItem,
  note: MoleculeData['note'],
  profileTags: string[],
  families: string,
): string {
  const roleLabel = note === 'top' ? 'ilk açılışı' : note === 'heart' ? 'kalp notalarını' : 'kalan izi';
  const profileText = profileTags.length > 0 ? profileTags.slice(0, 2).join(' · ').toLowerCase() : '';
  const familyText = families.trim();

  if (profileText && familyText) {
    return `${item.name}, ${familyText.toLowerCase()} çizgiyi ${profileText} karakteriyle güçlendirip bu parfümün ${roleLabel} belirginleştiriyor.`;
  }

  if (familyText) {
    return `${item.name}, ${familyText.toLowerCase()} etkisiyle bu parfümün ${roleLabel} karakteristik hale getiriyor.`;
  }

  return `${item.name}, kompozisyonun ${roleLabel} öne çıkaran karakter moleküllerden biri olarak çalışıyor.`;
}

function toMoleculeData(molecules: MoleculeItem[], lookup: Record<string, MoleculeLookupRow>): MoleculeData[] {
  return molecules.map((item, index) => {
    const resolved = lookup[item.name.toLowerCase()] || {};
    const catalog = getPublicMoleculeByName(item.name);
    const note = normalizeMoleculeNote(item.note, index, molecules.length);
    const smiles = resolved.smiles || item.smiles || catalog?.smiles || undefined;
    const verified = Boolean(smiles);
    const formula = verified ? resolved.formula || item.formula || catalog?.iupac_name || '' : '';
    const family = resolved.family || item.family || catalog?.families.join(' · ') || '';
    const origin = resolved.origin || item.origin || catalog?.natural_source || '';
    const profileTags = catalog?.profile_tags ?? [];

    return {
      name: item.name,
      formula,
      type: verified ? resolveMoleculeType(family) : 'Doğrulanmamış nota izi',
      note,
      origin: resolveMoleculeOrigin(origin),
      pct: parseContributionPct(item.contribution, index, molecules.length),
      smiles,
      verified,
      slug: catalog?.slug,
      casNumber: catalog?.cas_number,
      profileTags,
      funFact: catalog?.fun_fact,
      explanation: buildMoleculeExplanation(item, note, profileTags, family),
    };
  });
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
  const topNotes = toList(result.pyramid?.top, 6).length;
  const heartNotes = toList(result.pyramid?.middle, 8).length;
  const baseNotes = toList(result.pyramid?.base, 8).length;
  const noteCoverage = Math.min((topNotes + heartNotes + baseNotes) * 2.4, 22);
  const moleculeCoverage = Math.min(sanitizeMolecules(result.molecules).length * 4.5, 18);
  const similarCoverage = Math.min(toList(result.similar, 10).length * 2.5, 12);
  const technicalCoverage = Math.min(
    result.technical.filter((item) => typeof item.score === 'number' && Number.isFinite(item.score)).length * 4,
    16,
  );
  const personaCoverage = result.persona ? 8 : 0;
  const timelineCoverage = result.timeline ? 8 : 0;
  const dupeCoverage = Math.min(toList(result.dupes, 8).length * 1.5, 6);
  const descriptionCoverage = Math.min(Math.max(result.description.trim().length - 90, 0) / 12, 8);
  const intensityCoverage = clampPercent(result.intensity, 65) * 0.08;

  const derivedScore = clampPercent(
    34 +
      noteCoverage +
      moleculeCoverage +
      similarCoverage +
      technicalCoverage +
      personaCoverage +
      timelineCoverage +
      dupeCoverage +
      descriptionCoverage +
      intensityCoverage,
    78,
  );

  if (typeof result.confidence === 'number' && Number.isFinite(result.confidence)) {
    return clampPercent(Math.round(derivedScore * 0.7 + clampPercent(result.confidence, 87) * 0.3), derivedScore);
  }

  return derivedScore;
}

function resolveMetricScore(items: TechnicalItem[], matcher: RegExp, fallback: number): number {
  const hit = items.find((item) => matcher.test(item.label.toLowerCase()));
  return clampPercent(hit?.score, fallback);
}

function resolvePreferenceMatch(
  result: AnalysisResult,
  prefs: OnboardingPreferences | null,
): { score: number; summary: string } {
  if (!prefs) {
    return { score: 0, summary: 'Kişisel tercih profili henüz kurulmadı.' };
  }

  let score = 0;
  const matches: string[] = [];
  const seasonHit = prefs.season && result.season.some((item) => item.toLowerCase() === prefs.season.toLowerCase());
  if (seasonHit) {
    score += 16;
    matches.push(`${prefs.season} ritmine uyuyor`);
  }

  const vibe = result.persona?.vibe?.toLowerCase() || '';
  const family = result.family.toLowerCase();
  const stanceMatchers: Record<Exclude<OnboardingPreferences['stance'], ''>, string[]> = {
    Sakin: ['sakin', 'temiz', 'soft', 'minimal', 'fresh'],
    Çarpıcı: ['çarpıcı', 'güçlü', 'yoğun', 'gece', 'oryantal'],
    Sofistike: ['sofistike', 'zarif', 'odunsu', 'amber', 'şık'],
  };
  if (prefs.stance) {
    const stanceHit = stanceMatchers[prefs.stance].some((item) => vibe.includes(item) || family.includes(item));
    if (stanceHit) {
      score += 14;
      matches.push(`${prefs.stance} tavrını destekliyor`);
    }
  }

  if (prefs.intensity) {
    const intensity = clampPercent(result.intensity, 65);
    const wantedBand =
      prefs.intensity === 'Hafif' ? intensity <= 42 : prefs.intensity === 'Orta' ? intensity >= 35 && intensity <= 72 : intensity >= 65;
    if (wantedBand) {
      score += 16;
      matches.push(`${prefs.intensity.toLowerCase()} yoğunluk beklentine yakın`);
    }
  }

  return {
    score,
    summary: matches.length > 0 ? matches.join(' • ') : 'Koku karakteri tercihlerine kısmen yakın görünüyor.',
  };
}

const FAMILY_GLOW: Record<string, string> = {
  'Aromatik Fougere': 'rgba(126,184,164,.08)',
  Oryantal: 'rgba(201,169,110,.1)',
  Floral: 'rgba(200,140,180,.08)',
  Fresh: 'rgba(90,180,200,.08)',
  Woody: 'rgba(160,130,100,.08)',
  Chypre: 'rgba(126,184,164,.08)',
};

const ANALYSIS_STEPS = [
  'Koku profili çözümleniyor...',
  'Nota piramidi kuruluyor...',
  'Moleküler izler eşleştiriliyor...',
  'Benzer profiller taranıyor...',
] as const;

const WHEEL_AXES = [
  { label: 'Tazelik', short: 'F', color: 'var(--sage)' },
  { label: 'Tatlılık', short: 'T', color: '#d58ebb' },
  { label: 'Sıcaklık', short: 'S', color: 'var(--gold)' },
  { label: 'Yoğunluk', short: 'Y', color: '#8ab8c0' },
] as const;

export const AnalysisResults = memo(function AnalysisResults({
  result,
  isAnalyzing,
  onAnalyzeSimilar,
}: AnalysisResultsProps) {
  const entitlement = useBillingEntitlement();
  const [moleculeIndex, setMoleculeIndex] = useState(0);
  const [molCardIdx, setMolCardIdx] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [barsReady, setBarsReady] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
  const [moleculeLookup, setMoleculeLookup] = useState<Record<string, MoleculeLookupRow>>({});
  const [onboardingPreferences, setOnboardingPreferences] = useState<OnboardingPreferences | null>(null);
  const shareCardRef = useRef<HTMLDivElement | null>(null);
  const storyShareRef = useRef<HTMLDivElement | null>(null);
  const moleculeShareRef = useRef<HTMLDivElement | null>(null);
  const [moleculeShareBusy, setMoleculeShareBusy] = useState(false);

  useEffect(() => {
    if (!isAnalyzing) {
      setAnalysisStepIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setAnalysisStepIndex((current) => (current + 1) % ANALYSIS_STEPS.length);
    }, 1800);

    return () => window.clearInterval(timer);
  }, [isAnalyzing]);

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

  useEffect(() => {
    setOnboardingPreferences(getOnboardingPreferences());
  }, [result?.id]);

  const activeResult = result;
  const rawMolecules = useMemo(() => (activeResult ? sanitizeMolecules(activeResult.molecules) : []), [activeResult]);

  useEffect(() => {
    if (!activeResult || rawMolecules.length === 0) {
      setMoleculeLookup({});
      return;
    }

    let cancelled = false;
    const names = Array.from(new Set(rawMolecules.map((item) => item.name.trim()).filter(Boolean)));

    async function hydrateMolecules(): Promise<void> {
      try {
        const response = await fetch('/api/molecule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names }),
        });
        if (!response.ok) return;
        const data = (await response.json()) as { molecules?: Array<Record<string, unknown>> };
        if (cancelled || !Array.isArray(data.molecules)) return;
        const nextLookup: Record<string, MoleculeLookupRow> = {};
        data.molecules.forEach((item) => {
          const name = typeof item.query === 'string' ? item.query : typeof item.name === 'string' ? item.name : '';
          if (!name) return;
          nextLookup[name.toLowerCase()] = {
            smiles: typeof item.smiles === 'string' ? item.smiles : undefined,
            formula: typeof item.formula === 'string' ? item.formula : undefined,
            family: typeof item.family === 'string' ? item.family : undefined,
            origin: typeof item.origin === 'string' ? item.origin : undefined,
          };
        });
        if (!cancelled) setMoleculeLookup(nextLookup);
      } catch (error) {
        console.error('[analysis-results] molecule hydrate failed.', error);
      }
    }

    void hydrateMolecules();

    return () => {
      cancelled = true;
    };
  }, [activeResult, rawMolecules]);

  const season = activeResult ? toList(activeResult.season, 6) : [];
  const allSimilarItems = activeResult ? buildSimilarItems(toList(activeResult.similar, 10)) : [];
  const dupes = activeResult ? toList(activeResult.dupes, 8) : [];
  const allMoleculeData = activeResult ? toMoleculeData(rawMolecules, moleculeLookup) : [];
  const visibleMoleculeCount = activeResult
    ? Math.min(allMoleculeData.length, Math.max(1, entitlement.moleculeUnlockedCount))
    : 0;
  const moleculeData = allMoleculeData.slice(0, visibleMoleculeCount);
  const hiddenMoleculeCount = Math.max(0, allMoleculeData.length - moleculeData.length);
  const moleculeSafeIndex = Math.max(0, Math.min(moleculeIndex, Math.max(0, moleculeData.length - 1)));
  const molecule = moleculeData[moleculeSafeIndex] || null;
  const similarItems = allSimilarItems.slice(0, entitlement.similarLimit);
  const hiddenSimilarCount = Math.max(0, allSimilarItems.length - similarItems.length);
  const occasionList = activeResult ? toList(activeResult.persona?.occasions, 5) : [];
  const scores = {
    freshness: clampPercent(activeResult?.scores?.freshness, 50),
    sweetness: clampPercent(activeResult?.scores?.sweetness, 50),
    warmth: clampPercent(activeResult?.scores?.warmth, 50),
  };
  const wheelValues = [scores.freshness, scores.sweetness, scores.warmth, clampPercent(activeResult?.intensity, 65)];
  const confidence = activeResult ? resolveConfidence(activeResult) : 0;
  const preferenceMatch = activeResult
    ? resolvePreferenceMatch(activeResult, onboardingPreferences)
    : { score: 0, summary: '' };
  const heartNotes = activeResult?.pyramid?.middle ?? [];
  const glowColor = activeResult ? FAMILY_GLOW[activeResult.family] ?? 'rgba(201,169,110,.06)' : 'rgba(201,169,110,.06)';
  const projectionScore = resolveMetricScore(activeResult?.technical ?? [], /yayilim|projection|sillage/, 68);
  const longevityScore = resolveMetricScore(activeResult?.technical ?? [], /kalicilik|longevity|lasting/, 80);
  const baseFitScore = clampPercent(Math.round((confidence + clampPercent(activeResult?.intensity, 70)) / 2), 84);
  const fitScore = clampPercent(baseFitScore + preferenceMatch.score, baseFitScore);
  const signatureTags = activeResult
    ? [activeResult.family, activeResult.persona?.vibe || '', activeResult.occasion || '', season[0] || ''].filter(Boolean)
    : [];

  const cardMotion = (index: number) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(12px)',
    transition: `opacity .4s ease ${index * 80}ms, transform .4s var(--ease) ${index * 80}ms`,
  });

  useEffect(() => {
    if (moleculeIndex <= Math.max(0, moleculeData.length - 1)) return;
    setMoleculeIndex(0);
  }, [moleculeData.length, moleculeIndex]);

  if (isAnalyzing) {
    return (
      <section className="anim-up-1 px-5 pb-8 md:px-12">
        <SectionDivider label="Analiz İşleniyor" />
        <Card className="overflow-hidden p-7 md:p-9">
          <div className="flex flex-col gap-7 md:flex-row md:items-center">
            <div className="relative flex h-28 w-28 items-center justify-center self-center rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)]/30 md:self-start">
              <div className="absolute inset-3 rounded-full border border-white/[.07] animate-[aura-breathe_6s_ease-in-out_infinite]" />
              <div className="absolute h-10 w-10 rounded-full bg-[radial-gradient(circle,rgba(167,139,250,.9)_0%,rgba(167,139,250,.15)_68%,transparent_100%)] blur-[1px]" />
              <div className="relative h-4 w-4 rounded-full bg-gold shadow-[0_0_22px_rgba(201,169,110,.35)]" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="mb-2 text-[1.9rem] font-semibold text-cream md:text-[2.15rem]">{UI.analyzing}</p>
              <p className="text-[13px] text-muted">{ANALYSIS_STEPS[analysisStepIndex]}</p>

              <div className="mt-6 h-[2px] overflow-hidden rounded-full bg-white/[.08]">
                <div
                  className="h-full rounded-full shimmer-line"
                  style={{ width: `${((analysisStepIndex + 1) / ANALYSIS_STEPS.length) * 100}%` }}
                />
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
                {ANALYSIS_STEPS.map((step, index) => {
                  const active = index === analysisStepIndex;
                  return (
                    <span
                      key={step}
                      className={`rounded-full border px-3 py-1.5 text-[10px] font-mono uppercase tracking-[.1em] transition-all ${
                        active ? 'border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold' : 'border-white/[.07] text-muted'
                      }`}
                    >
                      {step.replace('...', '')}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      </section>
    );
  }

  if (!activeResult) return null;

  async function buildAnalysisShareFile(): Promise<File | null> {
    if (!storyShareRef.current || !activeResult) return null;
    const { toPng } = await import('html-to-image');
    const dataUrl = await toPng(storyShareRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#09080a',
    });
    const blob = await fetch(dataUrl).then((response) => response.blob());
    return new File([blob], `${activeResult.name.toLowerCase().replace(/\s+/g, '-')}-story.png`, { type: 'image/png' });
  }

  async function downloadFile(file: File): Promise<void> {
    const downloadUrl = window.URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(downloadUrl);
  }

  async function shareResultCard(): Promise<void> {
    if (shareBusy || !activeResult) return;
    setShareBusy(true);
    try {
      const file = await buildAnalysisShareFile();
      if (!file) return;
      const supportsFiles =
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        (typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] }));

      if (supportsFiles) {
        await navigator.share({
          title: activeResult.name,
          text: `${activeResult.name} moleküler olarak Koku Dedektifi ile analiz edildi.`,
          files: [file],
        });
      } else {
        await downloadFile(file);
      }
      setShareModalOpen(false);
    } catch (error) {
      console.error('[analysis-results] share failed.', error);
    } finally {
      setShareBusy(false);
    }
  }

  async function copyResultLink(): Promise<void> {
    if (!activeResult || shareBusy) return;
    setShareBusy(true);
    try {
      const link = `${window.location.origin}/?replay=${encodeURIComponent(activeResult.id)}`;
      await navigator.clipboard.writeText(link);
      window.alert('Bağlantı kopyalandı.');
      setShareModalOpen(false);
    } catch (error) {
      console.error('[analysis-results] copy failed.', error);
    } finally {
      setShareBusy(false);
    }
  }

  async function downloadResultCard(): Promise<void> {
    if (shareBusy) return;
    setShareBusy(true);
    try {
      const file = await buildAnalysisShareFile();
      if (!file) return;
      await downloadFile(file);
      setShareModalOpen(false);
    } catch (error) {
      console.error('[analysis-results] download failed.', error);
    } finally {
      setShareBusy(false);
    }
  }

  async function shareMoleculesCard(): Promise<void> {
    if (!moleculeShareRef.current || moleculeShareBusy || !molecule || !activeResult) return;
    const currentResult = activeResult;
    setMoleculeShareBusy(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(moleculeShareRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#09080a',
      });
      const blob = await fetch(dataUrl).then((response) => response.blob());
      const file = new File([blob], `${molecule.name.toLowerCase().replace(/\s+/g, '-')}-molekuller.png`, {
        type: 'image/png',
      });
      const supportsFiles =
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        (typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] }));

      if (supportsFiles) {
        await navigator.share({
          title: `${currentResult.name} · Molekül Katmanı`,
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
      console.error('[analysis-results] molecule share failed.', error);
    } finally {
      setMoleculeShareBusy(false);
    }
  }

  return (
    <section className="anim-up-2 px-5 pb-8 md:px-12">
      <SectionDivider label="Analiz Sonucu" />

      <div ref={shareCardRef} className="mb-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card
          className="relative self-start overflow-hidden p-7 md:p-9"
          glow
          style={{
            ...cardMotion(0),
            backgroundImage: `radial-gradient(ellipse at top right, ${glowColor} 0%, transparent 60%)`,
          }}
        >
          <div className="absolute left-5 top-5">
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              disabled={shareBusy}
              className="rounded-full border border-white/[.08] bg-black/20 px-3 py-2 text-[10px] font-mono uppercase tracking-[.08em] text-muted transition-colors hover:border-[var(--gold-line)] hover:text-cream disabled:opacity-50"
            >
              {shareBusy ? 'Hazırlanıyor' : 'Paylaş'}
            </button>
          </div>
          <div className="absolute right-5 top-5">
            <ConfidenceRing pct={confidence} />
          </div>

          <CardTitle>{UI.detectedScent}</CardTitle>
          <div className="flex items-start gap-4 pr-20">
            <ScentGlyph
              token={activeResult.iconToken}
              size={64}
              className="inline-flex items-center justify-center rounded-2xl border border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-[2rem] font-semibold leading-[1.02] text-cream md:text-[2.45rem]">{activeResult.name}</h2>
              <p className="mt-2 text-[11px] font-mono uppercase tracking-[.12em] text-gold">{activeResult.family || 'Aromatik'}</p>
            </div>
          </div>

          <div className="mt-7">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-[.1em] text-muted">Yoğunluk</span>
              <span className="text-[12px] text-cream">{activeResult.intensity}%</span>
            </div>
            <div className="h-[6px] overflow-hidden rounded-full bg-white/[.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#9f4f64] via-[#d97568] to-[#f0b267] transition-all duration-500 ease-out"
                style={{ width: `${activeResult.intensity}%` }}
              />
            </div>
          </div>

          <div className="mt-6 border-t border-white/[.06] pt-5">
            <CardTitle>{UI.scentDescription}</CardTitle>
            <p className="text-[15px] leading-relaxed text-cream/95">{activeResult.description || 'Açıklama şu an hazır değil.'}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {season.map((tag) => (
                <span key={tag} className="rounded-full border border-white/[.08] px-2.5 py-1.5 text-[10px] font-mono text-muted">
                  {tag}
                </span>
              ))}
              {activeResult.occasion ? (
                <span className="rounded-full border border-[var(--gold-line)] px-2.5 py-1.5 text-[10px] font-mono text-gold">{activeResult.occasion}</span>
              ) : null}
            </div>
          </div>

          <div className="mt-4 rounded-[24px] border border-white/[.06] bg-black/10 p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <CardTitle>Koku Sahnesi</CardTitle>
              <span className="text-[10px] font-mono uppercase tracking-[.12em] text-gold">Canlı iz</span>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[108px_minmax(0,1fr)] lg:items-center">
              <div className="relative z-10 mx-auto flex h-[108px] w-[108px] items-center justify-center overflow-hidden rounded-full border border-white/[.08] bg-white/[.02]">
                <div className="absolute inset-[22px] rounded-full bg-[radial-gradient(circle,rgba(167,139,250,.24)_0%,rgba(167,139,250,.08)_54%,transparent_100%)]" />
                <div className="relative text-center">
                  <p className="text-[9px] font-mono uppercase tracking-[.16em] text-muted">İz skoru</p>
                  <p className="mt-2 text-[1.85rem] font-bold leading-none text-cream">
                    <AnimatedPercent value={confidence} />
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SceneCell label="Duruş" value={activeResult.persona?.vibe || 'Dengeli'} tone="#a78bfa" />
                <SceneCell label="An" value={activeResult.occasion || 'Günlük'} tone="var(--gold)" />
                <SceneCell label="İz" value={season[0] || 'Dört mevsim'} tone="var(--sage)" />
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-white/[.06] pt-6">
            <CardTitle>İmza Sinyalleri</CardTitle>
            <SignalTelemetry
              longevity={longevityScore}
              projection={projectionScore}
              fit={fitScore}
              tags={signatureTags}
              barsReady={barsReady}
            />
          </div>
        </Card>

        <Card className="self-start p-6 content-auto-panel" style={cardMotion(1)}>
          <CardTitle>{UI.pyramid}</CardTitle>
          <div className="space-y-4">
            <PyramidRow label={UI.topNote} items={toList(activeResult.pyramid?.top, 6)} />
            <PyramidRow label={UI.heartNote} items={toList(heartNotes, 8)} />
            <PyramidRow label={UI.baseNote} items={toList(activeResult.pyramid?.base, 8)} />
          </div>

          <div className="mt-6 border-t border-white/[.06] pt-6">
            <ScentTimeline
              topNotes={toList(activeResult.pyramid?.top, 6)}
              heartNotes={toList(heartNotes, 8)}
              baseNotes={toList(activeResult.pyramid?.base, 8)}
              timeline={activeResult.timeline}
            />
          </div>

          <div className="mt-6 border-t border-white/[.06] pt-5">
            <CardTitle>{UI.suitability}</CardTitle>
            {onboardingPreferences ? (
              <div className="mb-3 rounded-2xl border border-[var(--gold-line)] bg-[var(--gold-dim)]/10 px-3.5 py-3">
                <p className="text-[10px] font-mono uppercase tracking-[.12em] text-gold">Sana uyum skoru</p>
                <p className="mt-2 text-[13px] leading-relaxed text-cream/92">{preferenceMatch.summary}</p>
              </div>
            ) : null}
            {activeResult.persona ? (
              <div className="space-y-2 text-[12px] text-muted">
                <InfoLine label="Koku duruşu" value={activeResult.persona.vibe || 'Dengeli'} />
                <InfoLine label="Kullanım sahnesi" value={occasionList.join(', ') || activeResult.occasion || 'Genel kullanım'} />
                <InfoLine label="Cinsiyet dengesi" value={activeResult.persona.gender || 'Unisex'} />
                <InfoLine label="Sezon eğilimi" value={season.join(', ') || activeResult.persona.season || 'Dört mevsim'} />
              </div>
            ) : (
              <p className="text-[12px] text-muted">Bu kokuda persona sinyali sınırlı; genel kullanım sahnesine açık.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <Card className="self-start p-6 content-auto-panel" style={cardMotion(2)}>
          <CardTitle className="mb-4">{UI.keyMolecules}</CardTitle>
          {molecule ? (
            <div>
              <button
                type="button"
                className="w-full rounded-[28px] border border-white/[.08] bg-[#0c0b10] p-4 text-left transition-colors hover:border-[var(--gold-line)]"
                onClick={() => setMolCardIdx(moleculeSafeIndex)}
                aria-label={`${molecule.name} molekül kartını aç`}
              >
                <MoleculeVisual name={molecule.name} smiles={molecule.smiles} formula={molecule.formula} compact />
              </button>

              <div className="mt-4 grid grid-cols-[30px_minmax(0,1fr)_30px] items-start gap-3">
                <button type="button" onClick={() => setMoleculeIndex((prev) => Math.max(0, prev - 1))} className="icon-btn" disabled={moleculeSafeIndex === 0} aria-label="Önceki molekül">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M8.8 2.3 4.2 7l4.6 4.7" />
                  </svg>
                </button>
                <div className="min-w-0 text-center">
                  {molecule.slug ? (
                    <Link
                      href={`/molekuller/${molecule.slug}`}
                      className="block break-words text-[clamp(1.75rem,4.5vw,3rem)] font-semibold leading-[0.94] text-cream transition-colors hover:text-gold"
                    >
                      {molecule.name}
                    </Link>
                  ) : (
                    <p className="break-words text-[clamp(1.75rem,4.5vw,3rem)] font-semibold leading-[0.94] text-cream">{molecule.name}</p>
                  )}
                  <p className="mt-2 break-words text-[12px] text-muted">
                    {molecule.formula || 'Doğrulanmış formül yok'}
                    {molecule.casNumber ? ` · CAS ${molecule.casNumber}` : ''}
                  </p>
                  <p className="mt-1 text-[11px] text-sage">{molecule.type || 'Molekül ailesi'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMoleculeIndex((prev) => Math.min(moleculeData.length - 1, prev + 1))}
                  className="icon-btn"
                  disabled={moleculeSafeIndex >= moleculeData.length - 1}
                  aria-label="Sonraki molekül"
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
                        className={`h-1.5 rounded-full transition-all ${index === moleculeSafeIndex ? 'w-8 bg-gold' : 'w-1.5 bg-white/[.25]'}`}
                        aria-label={`${index + 1}. moleküle git`}
                      />
                    ))}
                  </div>

                  <div className="mt-4 max-h-[180px] space-y-2 overflow-auto pr-1">
                    {moleculeData.map((item, index) => {
                      const pct = clampPercent(item.pct, 50);
                      const accent = moleculeAccent(index);
                      return (
                        <button
                          key={`${item.name}-${index}-row`}
                          type="button"
                          onClick={() => {
                            setMoleculeIndex(index);
                            setMolCardIdx(index);
                          }}
                          className={`w-full rounded-lg border px-3 py-2 text-left transition-all duration-150 ${index === moleculeSafeIndex ? 'border-[var(--gold-line)] bg-[var(--gold-dim)]/30' : 'border-white/[.07] hover:border-[var(--gold-line)]'}`}
                          aria-label={`${item.name} detayını göster`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate text-[12px] text-cream">{item.name}</span>
                            <span className="text-[11px] font-mono" style={{ color: accent }}>
                              {pct}%
                            </span>
                          </div>
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[.08]">
                            <div
                              className="mol-bar h-full rounded-full"
                              style={{
                                width: barsReady ? `${pct}%` : '0%',
                                background: accent,
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

              {hiddenMoleculeCount > 0 ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--gold-line)]/50 bg-[linear-gradient(180deg,rgba(245,158,11,0.07),rgba(13,13,18,0.95))]">
                  <div className="px-4 py-4">
                    <p className="text-[10px] font-mono uppercase tracking-[.16em] text-gold/80">PRO duvarı</p>
                    <p className="mt-2 text-[15px] font-semibold text-cream">{hiddenMoleculeCount} molekül daha gizli</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-cream/78">
                      Ücretsiz katmanda ilk iki molekül görünür. Tam molekül analizi ve detay sayfaları Pro ile açılır.
                    </p>
                    <Link
                      href="/paketler"
                      className="mt-4 inline-flex rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)]/20 px-3.5 py-2 text-[10px] font-mono uppercase tracking-[.12em] text-gold transition-colors hover:bg-[var(--gold-dim)]/35"
                    >
                      PRO ile gör
                    </Link>
                  </div>
                  <div className="pointer-events-none border-t border-white/[.06] bg-black/30 px-4 py-3 blur-[1.5px]">
                    {allMoleculeData.slice(visibleMoleculeCount, visibleMoleculeCount + 2).map((item) => (
                      <div key={`${item.name}-locked`} className="flex items-center justify-between py-2 text-[12px] text-white/40">
                        <span>{item.name}</span>
                        <span>{clampPercent(item.pct, 50)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {molecule.explanation ? (
                <div className="mt-4 rounded-2xl border border-white/[.08] bg-white/[.03] px-4 py-3">
                  <p className="text-[10px] font-mono uppercase tracking-[.12em] text-gold">Molekül Yorumu</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-cream/92">{molecule.explanation}</p>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {molecule.profileTags?.slice(0, 3).map((tag) => (
                  <span
                    key={`${molecule.name}-${tag}`}
                    className="rounded-full border border-white/[.08] px-2.5 py-1.5 text-[10px] font-mono text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {molecule.slug ? (
                  <Link
                    href={`/molekuller/${molecule.slug}`}
                    className="rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)]/20 px-3.5 py-2 text-[10px] font-mono uppercase tracking-[.08em] text-gold transition-colors hover:bg-[var(--gold-dim)]/35"
                  >
                    Detay sayfasına git
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => void shareMoleculesCard()}
                  disabled={moleculeShareBusy}
                  className="rounded-full border border-white/[.08] bg-black/20 px-3.5 py-2 text-[10px] font-mono uppercase tracking-[.08em] text-muted transition-colors hover:border-[var(--gold-line)] hover:text-cream disabled:opacity-50"
                >
                  {moleculeShareBusy ? 'Hazırlanıyor' : 'Bu Molekülleri Paylaş'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-muted">Bu analizde doğrulanmış molekül izi bulunamadı.</p>
          )}
        </Card>

        <Card className="self-start p-6 content-auto-panel" style={cardMotion(3)}>
          <CardTitle>{UI.similarScents}</CardTitle>
          <div className="flex flex-col gap-2">
            {similarItems.length > 0 ? (
              similarItems.map((item) => (
                <button key={`${item.name}-${item.similarity}`} type="button" onClick={() => onAnalyzeSimilar(item.name)} className="similar-item w-full rounded-xl border border-white/[.08] px-3.5 py-3 text-left transition-all hover:border-[var(--gold-line)] hover:bg-[var(--gold-dim)]/45">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="block truncate text-[14px] text-cream">{item.name}</span>
                      <span className="mt-1 block text-[11px] text-muted">Bu profile göre yeniden analiz çalıştır.</span>
                    </div>
                    <SimilarityArc pct={item.similarity} />
                  </div>
                </button>
              ))
            ) : (
              <p className="text-[12px] text-muted">Bu koku için benzer profil önerisi çıkmadı.</p>
            )}
          </div>

          {hiddenSimilarCount > 0 ? (
            <div className="mt-4 rounded-2xl border border-[var(--gold-line)]/35 bg-[var(--gold-dim)]/10 px-4 py-3">
              <p className="text-[10px] font-mono uppercase tracking-[.14em] text-gold">Pro ile Top 10</p>
              <p className="mt-2 text-[13px] leading-relaxed text-cream/82">
                {hiddenSimilarCount} benzer koku daha bulundu. Ücretsiz katmanda ilk {entitlement.similarLimit} sonuç görünür.
              </p>
              <Link
                href="/paketler"
                className="mt-3 inline-flex rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)]/20 px-3 py-2 text-[10px] font-mono uppercase tracking-[.12em] text-gold transition-colors hover:bg-[var(--gold-dim)]/35"
              >
                Top 10&apos;u aç
              </Link>
            </div>
          ) : null}

          {dupes.length > 0 ? (
            <div className="mt-5 border-t border-white/[.06] pt-5">
              <CardTitle className="mb-3">Benzer Profil Alternatifleri</CardTitle>
              <div className="flex flex-wrap gap-2">
                {dupes.map((item) => (
                  <span key={item} className="rounded-full border border-[var(--gold-line)] px-2.5 py-1.5 text-[10px] text-gold">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="self-start p-6 content-auto-panel" style={cardMotion(4)}>
          <CardTitle>{UI.wheel}</CardTitle>
          <div className="flex items-center justify-center py-2">
            <RadarWheel values={wheelValues} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {WHEEL_AXES.map((axis) => (
              <div key={axis.label} className="flex items-center gap-2 rounded-full border border-white/[.07] px-3 py-2 text-[10px] font-mono uppercase tracking-[.08em] text-muted">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: axis.color }} />
                <span>{axis.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <MetricPill label="Tazelik" value={scores.freshness} tone="var(--sage)" />
            <MetricPill label="Tatlılık" value={scores.sweetness} tone="#d58ebb" />
            <MetricPill label="Sıcaklık" value={scores.warmth} tone="#d3a36a" />
            <MetricPill label="Yoğunluk" value={clampPercent(activeResult.intensity, 65)} tone="#8ab8c0" />
          </div>
        </Card>
      </div>

      {molecule ? (
        <div
          ref={storyShareRef}
          className="fixed -left-[9999px] top-0 flex h-[1280px] w-[720px] flex-col overflow-hidden rounded-[40px] border border-white/[.08] bg-[#09080a] p-10 text-cream"
        >
          <div className="rounded-[28px] border border-white/[.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-8">
            <p className="text-[12px] font-mono uppercase tracking-[.18em] text-gold/85">Koku Dedektifi</p>
            <h2 className="mt-5 font-display text-[4.4rem] leading-[0.94] text-cream">{activeResult.name}</h2>
            <p className="mt-3 text-[16px] uppercase tracking-[.18em] text-muted">{activeResult.family}</p>
          </div>

          <div className="mt-6 grid grid-cols-[1.1fr_0.9fr] gap-6">
            <div className="rounded-[28px] border border-white/[.08] bg-white/[.03] p-6">
              <p className="text-[11px] font-mono uppercase tracking-[.16em] text-gold">Top 3 nota</p>
              <div className="mt-4 space-y-3 text-[20px] leading-tight text-cream">
                {[
                  ...toList(activeResult.pyramid?.top, 2),
                  ...toList(activeResult.pyramid?.middle, 2),
                  ...toList(activeResult.pyramid?.base, 2),
                ]
                  .slice(0, 3)
                  .map((note) => (
                    <p key={`story-${note}`}>{note}</p>
                  ))}
              </div>

              <div className="mt-8 rounded-[24px] border border-[var(--gold-line)] bg-[var(--gold-dim)]/12 p-5">
                <p className="text-[11px] font-mono uppercase tracking-[.16em] text-gold/80">İz skoru</p>
                <p className="mt-3 text-[3.4rem] font-semibold leading-none text-cream">
                  <AnimatedPercent value={confidence} />
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/[.08] bg-[#0c0b10] p-5">
              <MoleculeVisual name={molecule.name} smiles={molecule.smiles} formula={molecule.formula} compact />
              <p className="mt-4 text-[11px] font-mono uppercase tracking-[.16em] text-gold/80">Baskın molekül</p>
              <p className="mt-2 text-[1.8rem] font-semibold text-cream">{molecule.name}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-cream/76">
                {molecule.explanation || `${molecule.name}, bu parfümün karakterini taşıyan temel moleküllerden biri.`}
              </p>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between rounded-[24px] border border-white/[.08] bg-white/[.03] px-6 py-5">
            <p className="text-[14px] text-cream/78">Koku Dedektifi ile analiz edildi</p>
            <p className="text-[12px] font-mono uppercase tracking-[.16em] text-gold">kokudedektifi.com</p>
          </div>
        </div>
      ) : null}

      {molecule ? (
        <div
          ref={moleculeShareRef}
          className="fixed -left-[9999px] top-0 w-[720px] overflow-hidden rounded-[32px] border border-white/[.08] bg-[#09080a] p-8 text-cream"
        >
          <p className="text-[11px] font-mono uppercase tracking-[.16em] text-gold">Molekül Katmanı</p>
          <div className="mt-4 flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-mono uppercase tracking-[.12em] text-muted">{activeResult.family || 'Koku Profili'}</p>
              <h3 className="mt-3 font-display text-[2.4rem] leading-[1.02] text-cream">{activeResult.name}</h3>
              <p className="mt-4 text-[14px] leading-relaxed text-cream/88">
                {molecule.explanation || `${molecule.name}, bu kompozisyonun belirgin izini taşıyan karakter moleküllerden biri.`}
              </p>
            </div>
            <div className="w-[240px] shrink-0 rounded-[28px] border border-white/[.08] bg-[#0c0b10] p-4">
              <MoleculeVisual name={molecule.name} smiles={molecule.smiles} formula={molecule.formula} compact />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {moleculeData.slice(0, 3).map((item, index) => (
              <div key={`${item.name}-share-${index}`} className="rounded-2xl border border-white/[.08] bg-white/[.03] p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-[.12em]" style={{ color: moleculeAccent(index) }}>
                    {item.note === 'top' ? 'Üst Nota' : item.note === 'heart' ? 'Kalp Nota' : 'Alt Nota'}
                  </span>
                  <span className="text-[12px] font-mono text-cream/70">{clampPercent(item.pct, 50)}%</span>
                </div>
                <p className="mt-3 text-[17px] font-semibold text-cream">{item.name}</p>
                <p className="mt-1 text-[12px] text-muted">{item.type}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <p className="text-[12px] text-muted">Koku Dedektifi ile moleküler düzeyde analiz edildi.</p>
            <p className="text-[12px] font-mono uppercase tracking-[.14em] text-gold">kokudedektifi.com</p>
          </div>
        </div>
      ) : null}

      <ShareAnalysisModal
        open={shareModalOpen}
        busy={shareBusy}
        onClose={() => setShareModalOpen(false)}
        onInstagramShare={shareResultCard}
        onCopyLink={copyResultLink}
        onDownload={downloadResultCard}
      />

      {molCardIdx !== null ? <MoleculeCard molecules={moleculeData} initialIndex={molCardIdx} onClose={() => setMolCardIdx(null)} /> : null}
    </section>
  );
});

function PyramidRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-white/[.06] p-3.5">
      <p className="mb-1.5 text-[10px] font-mono uppercase tracking-[.1em] text-muted">{label}</p>
      <p className="leading-relaxed text-cream/95">{items.length > 0 ? items.join(' / ') : 'Veri sınırlı'}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[.05] pb-2">
      <span className="text-[10px] font-mono uppercase tracking-[.1em] text-[var(--hint)]">{label}</span>
      <span className="text-right text-cream">{value}</span>
    </div>
  );
}

function ConfidenceRing({ pct }: { pct: number }) {
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

function SignalTelemetry({
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

function SceneCell({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-[18px] border border-white/[.07] bg-white/[.02] px-4 py-3">
      <p className="text-[9px] font-mono uppercase tracking-[.16em]" style={{ color: tone }}>
        {label}
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-cream/95">{value}</p>
    </div>
  );
}

function MetricPill({ label, value, tone }: { label: string; value: number; tone: string }) {
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

function AnimatedPercent({ value }: { value: number }) {
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
