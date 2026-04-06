'use client';

import { memo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { SectionDivider } from './ui/SectionDivider';
import { AnalysisLoadingState } from './analysis-results/AnalysisLoadingState';
import { ShareCanvases } from './analysis-results/ShareCanvases';
import {
  DetailPanel,
  MoleculePanel,
  OverviewPanel,
  SimilarPanel,
  WheelPanel,
} from './analysis-results/panels';
import { useAnalysisResultsModel } from './analysis-results/useAnalysisResultsModel';

const MoleculeCard = dynamic(() => import('./MoleculeCard').then((module) => module.MoleculeCard));
const ShareAnalysisModal = dynamic(() =>
  import('./ShareAnalysisModal').then((module) => module.ShareAnalysisModal),
);

interface AnalysisResultsProps {
  result: import('@/lib/client/types').AnalysisResult | null;
  isAnalyzing: boolean;
  onAnalyzeSimilar: (name: string) => void;
}

export const AnalysisResults = memo(function AnalysisResults({
  result,
  isAnalyzing,
  onAnalyzeSimilar,
}: AnalysisResultsProps) {
  const model = useAnalysisResultsModel({ result, isAnalyzing });
  const sectionRef = useRef<HTMLElement | null>(null);
  const activeResultId = model.activeResult?.id ?? null;
  const hasActiveResult = Boolean(model.activeResult);
  const shouldShowSection = isAnalyzing || hasActiveResult;

  useEffect(() => {
    if (!shouldShowSection) return;

    const node = sectionRef.current;
    if (!node) return;

    const timeout = window.setTimeout(() => {
      node.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, isAnalyzing ? 30 : 80);

    return () => window.clearTimeout(timeout);
  }, [activeResultId, isAnalyzing, shouldShowSection]);

  if (!shouldShowSection) return null;

  return (
    <section
      ref={sectionRef}
      id="analysis-results"
      className="anim-up-2 scroll-mt-24 px-5 pb-8 md:px-12"
    >
      <SectionDivider label={isAnalyzing ? 'Analiz İşleniyor' : 'Analiz Sonucu'} />

      {isAnalyzing ? <AnalysisLoadingState analysisStepIndex={model.analysisStepIndex} /> : null}

      {!model.activeResult || isAnalyzing ? null : (
        <>
          <div ref={model.shareCardRef} className="mb-4 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
            <OverviewPanel
              result={model.activeResult}
              confidence={model.confidence}
              glowColor={model.glowColor}
              season={model.season}
              longevityScore={model.longevityScore}
              projectionScore={model.projectionScore}
              fitScore={model.fitScore}
              signatureTags={model.signatureTags}
              barsReady={model.barsReady}
              shareBusy={model.shareBusy}
              onOpenShare={() => model.setShareModalOpen(true)}
              style={model.cardMotion(0)}
            />

            <DetailPanel
              result={model.activeResult}
              heartNotes={model.heartNotes}
              style={model.cardMotion(1)}
            />
          </div>

          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
            <MoleculePanel
              molecule={model.molecule}
              moleculeData={model.moleculeData}
              moleculeSafeIndex={model.moleculeSafeIndex}
              hiddenMoleculeCount={model.hiddenMoleculeCount}
              visibleMoleculeCount={model.visibleMoleculeCount}
              allMoleculeData={model.allMoleculeData}
              barsReady={model.barsReady}
              onSelectMolecule={model.setMoleculeIndex}
              onOpenMolecule={(index) => {
                model.setMoleculeIndex(index);
                model.setMolCardIdx(index);
              }}
              onPrev={() => model.setMoleculeIndex((prev) => Math.max(0, prev - 1))}
              onNext={() => model.setMoleculeIndex((prev) => Math.min(model.moleculeData.length - 1, prev + 1))}
              onShare={model.shareMoleculesCard}
              moleculeShareBusy={model.moleculeShareBusy}
              style={model.cardMotion(2)}
            />

            <SimilarPanel
              similarItems={model.similarItems}
              hiddenSimilarCount={model.hiddenSimilarCount}
              similarLimit={model.entitlement.similarLimit}
              dupes={model.dupes}
              onAnalyzeSimilar={onAnalyzeSimilar}
              style={model.cardMotion(3)}
            />

            <WheelPanel
              wheelValues={model.wheelValues}
              scores={model.scores}
              intensity={model.activeResult.intensity}
              scoreCards={model.scoreCards}
              style={model.cardMotion(4)}
            />
          </div>

          <ShareCanvases
            result={model.activeResult}
            confidence={model.confidence}
            molecule={model.molecule}
            moleculeData={model.moleculeData}
            storyShareRef={model.storyShareRef}
            moleculeShareRef={model.moleculeShareRef}
          />

          <ShareAnalysisModal
            open={model.shareModalOpen}
            busy={model.shareBusy}
            onClose={() => model.setShareModalOpen(false)}
            onInstagramShare={model.shareResultCard}
            onCopyLink={model.copyResultLink}
            onDownload={model.downloadResultCard}
          />

          {model.molCardIdx !== null ? (
            <MoleculeCard
              molecules={model.moleculeData}
              initialIndex={model.molCardIdx}
              onClose={() => model.setMolCardIdx(null)}
            />
          ) : null}
        </>
      )}

    </section>
  );
});
