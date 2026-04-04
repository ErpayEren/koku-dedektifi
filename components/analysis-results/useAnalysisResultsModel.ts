'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getOnboardingPreferences } from '@/lib/client/storage';
import type { AnalysisResult } from '@/lib/client/types';
import type { OnboardingPreferences } from '@/lib/client/types';
import { useBillingEntitlement } from '@/lib/client/useBillingEntitlement';
import {
  ANALYSIS_STEPS,
  FAMILY_GLOW,
  type MoleculeLookupRow,
  buildSimilarItems,
  clampPercent,
  resolveConfidence,
  resolveMetricScore,
  resolvePreferenceMatch,
  sanitizeMolecules,
  toList,
  toMoleculeData,
} from './utils';

interface UseAnalysisResultsModelArgs {
  result: AnalysisResult | null;
  isAnalyzing: boolean;
}

export function useAnalysisResultsModel({ result, isAnalyzing }: UseAnalysisResultsModelArgs) {
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
  const [moleculeShareBusy, setMoleculeShareBusy] = useState(false);

  const shareCardRef = useRef<HTMLDivElement>(null);
  const storyShareRef = useRef<HTMLDivElement>(null);
  const moleculeShareRef = useRef<HTMLDivElement>(null);

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
  }, [result]);

  useEffect(() => {
    if (!result) {
      setBarsReady(false);
      return;
    }

    setBarsReady(false);
    const timer = window.setTimeout(() => setBarsReady(true), 60);
    return () => window.clearTimeout(timer);
  }, [result]);

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
  const allMoleculeData = activeResult ? toMoleculeData(rawMolecules, moleculeLookup, activeResult.name) : [];
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
  const preferenceMatch = activeResult ? resolvePreferenceMatch(activeResult, onboardingPreferences) : { score: 0, summary: '' };
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

  async function buildAnalysisShareFile(): Promise<File | null> {
    if (!storyShareRef.current || !activeResult) return null;

    const { toPng } = await import('html-to-image');
    const dataUrl = await toPng(storyShareRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#09080a',
    });
    const blob = await fetch(dataUrl).then((response) => response.blob());
    return new File([blob], `${activeResult.name.toLowerCase().replace(/\s+/g, '-')}-story.png`, {
      type: 'image/png',
    });
  }

  async function shareResultCard(): Promise<void> {
    if (!activeResult || shareBusy) return;
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
          title: `${activeResult.name} · Molekül Katmanı`,
          files: [file],
        });
      } else {
        await downloadFile(file);
      }
    } catch (error) {
      console.error('[analysis-results] molecule share failed.', error);
    } finally {
      setMoleculeShareBusy(false);
    }
  }

  return {
    entitlement,
    activeResult,
    season,
    dupes,
    moleculeData,
    hiddenMoleculeCount,
    moleculeSafeIndex,
    molecule,
    similarItems,
    hiddenSimilarCount,
    occasionList,
    scores,
    wheelValues,
    confidence,
    preferenceMatch,
    heartNotes,
    glowColor,
    projectionScore,
    longevityScore,
    fitScore,
    signatureTags,
    cardMotion,
    molCardIdx,
    setMolCardIdx,
    moleculeIndex,
    setMoleculeIndex,
    barsReady,
    shareBusy,
    shareModalOpen,
    setShareModalOpen,
    analysisStepIndex,
    moleculeShareBusy,
    shareResultCard,
    copyResultLink,
    downloadResultCard,
    shareMoleculesCard,
    shareCardRef,
    storyShareRef,
    moleculeShareRef,
    allMoleculeData,
    visibleMoleculeCount,
    onboardingPreferences,
  };
}
