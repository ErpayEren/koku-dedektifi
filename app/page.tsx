import dynamic from 'next/dynamic';
import { AppShell } from '@/components/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MainExperience } from '@/components/MainExperience';
import { getFeaturedMolecules } from '@/lib/catalog-public';
import type { MoleculePreviewEntry } from '@/components/MoleculePreviewStrip';

const OnboardingWizard = dynamic(
  () => import('@/components/OnboardingWizard').then((module) => module.OnboardingWizard),
  { ssr: false },
);

function buildFeaturedPreviewData(): MoleculePreviewEntry[] {
  return getFeaturedMolecules().map((item) => ({
    name: item.name,
    formula: item.iupac_name,
    type: item.families.join(' · '),
    note:
      item.longevity_contribution === 'top'
        ? 'top'
        : item.longevity_contribution === 'heart'
          ? 'heart'
          : 'base',
    origin: [item.natural_source, `${item.found_in_fragrances.length} parfümde görülüyor`],
    pct: Math.min(92, Math.max(24, Math.round(item.usage_percentage_typical * 6))),
    smiles: item.smiles,
    verified: true,
    slug: item.slug,
    casNumber: item.cas_number,
    profileTags: item.profile_tags,
    funFact: item.fun_fact,
    explanation: `${item.odor_description} çizgisini ${item.profile_tags.slice(0, 2).join(' · ').toLowerCase()} karakteriyle görünür kılar.`,
  }));
}

export default function HomePage() {
  const featuredMolecules = buildFeaturedPreviewData();

  return (
    <AppShell>
      <ErrorBoundary>
        <MainExperience featuredMolecules={featuredMolecules} />
      </ErrorBoundary>
      <OnboardingWizard />
    </AppShell>
  );
}
