'use client';

import { AppShell } from '@/components/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MainExperience } from '@/components/MainExperience';
import { OnboardingWizard } from '@/components/OnboardingWizard';

export default function HomePage() {
  return (
    <AppShell>
      <ErrorBoundary>
        <MainExperience />
      </ErrorBoundary>
      <OnboardingWizard />
    </AppShell>
  );
}
