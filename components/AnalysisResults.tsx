'use client';

import { memo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Card } from './ui/Card';
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

const ShareAnalysisModal = dynamic(() =>
  import('./ShareAnalysisModal').then((module) => module.ShareAnalysisModal),
);

interface AnalysisResultsProps {
  result: import('@/lib/client/types').AnalysisResult | null;
  isAnalyzing: boolean;
  onAnalyzeSimilar: (name: string) => void;
}

type AnalysisVoteValue = 'accurate' | 'partial' | 'wrong';

interface AnalysisAccuracyFeedbackProps {
  analysisId: string;
  voteSummary: {
    total: number;
    accurate: number;
    accuratePct: number;
  } | null;
  selectedVote: AnalysisVoteValue | null;
  voteBusy: boolean;
  voteError: string;
  voteThanks: boolean;
  canChangeVote: boolean;
  onVote: (vote: AnalysisVoteValue) => void;
}

function AnalysisAccuracyFeedback({
  analysisId,
  voteSummary,
  selectedVote,
  voteBusy,
  voteError,
  voteThanks,
  canChangeVote,
  onVote,
}: AnalysisAccuracyFeedbackProps) {
  if (!analysisId) return null;

  const total = voteSummary?.total ?? 0;
  const accurate = voteSummary?.accurate ?? 0;
  const accuratePct = voteSummary?.accuratePct ?? (total > 0 ? Math.round((accurate / total) * 100) : 0);
  const showAggregate = total >= 50;

  return (
    <Card className="mt-4 p-5 md:p-6">
      <p className="text-[10px] font-mono uppercase tracking-[.14em] text-gold">Kullanıcı Doğrulaması</p>
      <h3 className="mt-3 text-[18px] font-semibold text-cream">Bu analiz ne kadar doğru?</h3>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          { value: 'accurate' as const, label: '👍 Doğru' },
          { value: 'partial' as const, label: '👎 Kısmen' },
          { value: 'wrong' as const, label: '❌ Yanlış' },
        ].map((item) => {
          const active = selectedVote === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onVote(item.value)}
              disabled={voteBusy || (!canChangeVote && Boolean(selectedVote))}
              className={`rounded-xl border px-3 py-3 text-[13px] transition-colors ${
                active
                  ? 'border-[var(--gold-line)] bg-[var(--gold-dim)]/25 text-gold'
                  : 'border-white/[.09] bg-black/20 text-cream/88 hover:border-[var(--gold-line)]'
              } disabled:cursor-not-allowed disabled:opacity-75`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {voteThanks ? (
        <p className="mt-4 text-[13px] text-sage">Teşekkürler — bu verilerle analizleri iyileştiriyoruz.</p>
      ) : null}
      {selectedVote && canChangeVote ? (
        <p className="mt-2 text-[12px] text-muted">Analiz ekranindayken oyunu guncelleyebilirsin.</p>
      ) : null}
      {selectedVote && !canChangeVote ? (
        <p className="mt-2 text-[12px] italic text-muted">Gecmis analizlerde oy degisikligi kapalidir.</p>
      ) : null}
      {voteError ? <p className="mt-3 text-[13px] text-rose-300">{voteError}</p> : null}

      {showAggregate ? (
        <p className="mt-3 text-[13px] text-cream/85">
          {total} kullanıcıdan {accurate}&apos;u doğru buldu (%{accuratePct})
        </p>
      ) : null}
    </Card>
  );
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
      className="anim-up-2 scroll-mt-24 px-4 pb-[calc(var(--mobile-nav-h)+9rem)] md:px-12 md:pb-8"
    >
      <SectionDivider label={isAnalyzing ? 'Analiz İşleniyor' : 'Analiz Sonucu'} />

      {isAnalyzing ? <AnalysisLoadingState analysisStepIndex={model.analysisStepIndex} /> : null}

      {!model.activeResult || isAnalyzing ? null : (
        <>
          <div ref={model.shareCardRef} className="mb-4 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
            <OverviewPanel
              result={model.activeResult}
              confidence={model.confidence}
              dataTrustBadge={model.dataTrustBadge}
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
            <SimilarPanel
              similarItems={model.similarItems}
              hiddenSimilarCount={model.hiddenSimilarCount}
              similarLimit={model.entitlement.similarLimit}
              onAnalyzeSimilar={onAnalyzeSimilar}
              style={model.cardMotion(2)}
            />

            <MoleculePanel
              molecule={model.molecule}
              moleculeData={model.moleculeData}
              moleculeSafeIndex={model.moleculeSafeIndex}
              hiddenMoleculeCount={model.hiddenMoleculeCount}
              visibleMoleculeCount={model.visibleMoleculeCount}
              allMoleculeData={model.allMoleculeData}
              barsReady={model.barsReady}
              onSelectMolecule={(i) => model.setMoleculeIndex(i)}
              onOpenMolecule={(i) => model.setMoleculeIndex(i)}
              onPrev={() => model.setMoleculeIndex(Math.max(0, model.moleculeSafeIndex - 1))}
              onNext={() => model.setMoleculeIndex(Math.min(model.moleculeData.length - 1, model.moleculeSafeIndex + 1))}
              onShare={() => model.shareMoleculesCard()}
              moleculeShareBusy={model.moleculeShareBusy}
              style={model.cardMotion(3)}
            />

            <WheelPanel
              wheelValues={model.wheelValues}
              scores={model.scores}
              intensity={model.activeResult.intensity}
              genderProfile={model.activeResult.genderProfile}
              occasionList={model.occasionList}
              styleSuggestion={model.activeResult.persona?.vibe || ''}
              style={model.cardMotion(4)}
            />
          </div>

          <AnalysisAccuracyFeedback
            analysisId={model.activeResult.id}
            voteSummary={model.analysisVoteSummary}
            selectedVote={model.analysisVote}
            voteBusy={model.analysisVoteBusy}
            voteError={model.analysisVoteError}
            voteThanks={model.analysisVoteThanks}
            canChangeVote={model.canAdjustAnalysisVote}
            onVote={(vote) => {
              void model.sendAnalysisVote(vote);
            }}
          />

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

        </>
      )}

    </section>
  );
});
