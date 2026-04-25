'use client';

import dynamic from 'next/dynamic';
import { ActionBar } from './ActionBar';
import { HeroInput } from './HeroInput';
import { LegalFooter } from './LegalFooter';
import { TopBar } from './TopBar';
import { StatusBanners } from './main-experience/StatusBanners';
import { useMainExperienceController } from './main-experience/useMainExperienceController';
import { UI } from '@/lib/strings';

const AnalysisResults = dynamic(
  () => import('./AnalysisResults').then((module) => module.AnalysisResults),
  {
    loading: () => <div className="px-5 pb-8 md:px-12" />,
  },
);

export function MainExperience() {
  const controller = useMainExperienceController();

  return (
    <>
      <TopBar title={UI.navNewAnalysis} />

      <HeroInput
        mode={controller.mode}
        textValue={controller.textValue}
        imagePreview={controller.imagePreview}
        isAnalyzing={controller.isAnalyzing}
        onModeChange={controller.handleModeChange}
        onTextChange={controller.setTextValue}
        onImageChange={controller.handleImageChange}
        onAnalyze={controller.runAnalyze}
        onChipPick={controller.handleChipPick}
      />

      <StatusBanners
        error={controller.error}
        notice={controller.notice}
        statusCard={controller.statusCard}
        onRetry={controller.retryAnalyze}
        onOpenNotesMode={controller.openTextMode}
        onOpenPackages={controller.openPackages}
      />

      <AnalysisResults
        result={controller.result}
        isAnalyzing={controller.isAnalyzing}
        onAnalyzeSimilar={controller.onAnalyzeSimilar}
      />

      <ActionBar
        hasResult={Boolean(controller.result)}
        disabled={controller.isAnalyzing}
        wardrobeAdded={controller.wardrobeAdded}
        onAddWardrobe={controller.addToWardrobe}
        onCompare={controller.compareNow}
        onLayer={controller.openLayering}
        onSave={controller.saveResultFile}
      />

      <LegalFooter />
    </>
  );
}
