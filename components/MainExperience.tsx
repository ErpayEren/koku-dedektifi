'use client';

import { ActionBar } from './ActionBar';
import { AnalysisResults } from './AnalysisResults';
import { HeroInput } from './HeroInput';
import { LegalFooter } from './LegalFooter';
import { MoleculePreviewStrip } from './MoleculePreviewStrip';
import { TopBar } from './TopBar';
import { UpgradePromptModal } from './UpgradePromptModal';
import { StatusBanners } from './main-experience/StatusBanners';
import { useMainExperienceController } from './main-experience/useMainExperienceController';
import { UI } from '@/lib/strings';

export function MainExperience() {
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

      <MoleculePreviewStrip />

      <StatusBanners error={controller.error} notice={controller.notice} />

      <AnalysisResults
        result={controller.result}
        isAnalyzing={controller.isAnalyzing}
        onAnalyzeSimilar={controller.onAnalyzeSimilar}
      />

      <ActionBar
        hasResult={Boolean(controller.result)}
        disabled={controller.isAnalyzing}
        onAddWardrobe={controller.addToWardrobe}
        onCompare={controller.compareNow}
        onLayer={controller.openLayering}
        onSave={controller.saveResultFile}
      />

      <LegalFooter />

      <UpgradePromptModal
        open={controller.upgradeState.open}
        title={controller.upgradeState.title}
        body={controller.upgradeState.body}
        featureBullets={controller.upgradeState.featureBullets}
        onClose={controller.closeUpgradePrompt}
      />
    </>
  );
}
