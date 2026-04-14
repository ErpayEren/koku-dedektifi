'use client';

import dynamic from 'next/dynamic';
import { ActionBar } from './ActionBar';
import { HeroInput } from './HeroInput';
import { LegalFooter } from './LegalFooter';
import { TopBar } from './TopBar';
import { StatusBanners } from './main-experience/StatusBanners';
import { useMainExperienceController } from './main-experience/useMainExperienceController';
import { UI } from '@/lib/strings';
import type { MoleculePreviewEntry } from './MoleculePreviewStrip';

const AnalysisResults = dynamic(
  () => import('./AnalysisResults').then((module) => module.AnalysisResults),
  {
    loading: () => <div className="px-5 pb-8 md:px-12" />,
  },
);

const MoleculePreviewStrip = dynamic(
  () => import('./MoleculePreviewStrip').then((module) => module.MoleculePreviewStrip),
  {
    loading: () => <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6" />,
  },
);

interface MainExperienceProps {
  featuredMolecules: MoleculePreviewEntry[];
}

export function MainExperience({ featuredMolecules }: MainExperienceProps) {
  const controller = useMainExperienceController();

  return (
    <>
      <TopBar title={UI.navNewAnalysis} />

      <HeroInput
        mode={controller.mode}
        textValue={controller.textValue}
        notesValue={controller.notesValue}
        imagePreview={controller.imagePreview}
        isAnalyzing={controller.isAnalyzing}
        onModeChange={controller.handleModeChange}
        onTextChange={controller.setTextValue}
        onNotesChange={controller.setNotesValue}
        onImageChange={controller.handleImageChange}
        onAnalyze={controller.runAnalyze}
        onChipPick={controller.handleChipPick}
      />

      <MoleculePreviewStrip molecules={featuredMolecules} />

      <StatusBanners
        error={controller.error}
        notice={controller.notice}
        statusCard={controller.statusCard}
        onRetry={controller.retryAnalyze}
        onOpenNotesMode={controller.openNotesMode}
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
