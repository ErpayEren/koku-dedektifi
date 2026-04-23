import dynamic from 'next/dynamic';
import { AppShell } from '@/components/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MainExperience } from '@/components/MainExperience';

const OnboardingWizard = dynamic(
  () => import('@/components/OnboardingWizard').then((module) => module.OnboardingWizard),
  { ssr: false },
);

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
