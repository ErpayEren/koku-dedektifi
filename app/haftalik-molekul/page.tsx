import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { MoleculeVisual } from '@/components/MoleculeVisual';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { getPublicFragrancesForMolecule } from '@/lib/catalog-public';
import { getStaticMoleculeProfile } from '@/lib/data/molecules';
import { getWeeklyMolecule } from '@/lib/weekly-molecule';

export default function WeeklyMoleculePage() {
  const molecule = getWeeklyMolecule();

  if (!molecule) {
    return (
      <AppShell>
        <TopBar title="Haftalık Molekül" />
        <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          <Card className="mx-auto max-w-[920px] p-6">
            <CardTitle>Haftalık Molekül</CardTitle>
            <p className="mt-4 text-[14px] text-muted">Bu hafta için molekül seçimi henüz hazır değil.</p>
          </Card>
        </div>
      </AppShell>
    );
  }

  const fragrances = getPublicFragrancesForMolecule(molecule.slug);
  const staticProfile = getStaticMoleculeProfile(molecule.slug);
  const dynamicUsage =
    typeof molecule.usage_percentage_typical === 'number' && molecule.usage_percentage_typical > 0
      ? `%${molecule.usage_percentage_typical}`
      : '';
  const usageText = staticProfile?.typicalConcentration?.trim() || dynamicUsage;

  return (
    <AppShell>
      <TopBar title="Haftalık Molekül" />
      <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="mx-auto max-w-[1160px] space-y-4">
          <Card className="overflow-hidden p-5 sm:p-6 lg:p-8" glow="amber">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_360px] lg:items-start">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[.18em] text-gold/80">Her pazartesi seçilen molekül</p>
                <h1 className="mt-3 font-display text-[clamp(2.5rem,6vw,4.6rem)] leading-[0.96] text-cream">{molecule.name}</h1>
                <p className="mt-3 text-[13px] font-mono uppercase tracking-[.12em] text-muted">{molecule.iupac_name}</p>
                <p className="mt-5 max-w-[60ch] text-[15px] leading-relaxed text-cream/88">{molecule.fun_fact}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {molecule.families.map((family) => (
                    <span
                      key={family}
                      className="rounded-full border border-sage/25 bg-sage/10 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[.14em] text-sage"
                    >
                      {family}
                    </span>
                  ))}
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[.14em] text-cream/75">
                    {molecule.source_type}
                  </span>
                </div>
              </div>

              <MoleculeVisual
                name={molecule.name}
                smiles={molecule.smiles}
                formula={staticProfile?.formula || molecule.iupac_name}
                className="min-h-[320px]"
              />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
            <Card className="p-5 sm:p-6">
              <CardTitle>Koku Profili</CardTitle>
              <div className="mt-4 space-y-3 text-[14px] text-cream/88">
                <p>
                  <span className="text-muted">Yoğunluk:</span> {staticProfile?.intensity || molecule.odor_intensity}
                </p>
                <p>
                  <span className="text-muted">Doğal kaynak:</span> {staticProfile?.naturalSource || molecule.natural_source}
                </p>
                {usageText ? (
                  <p>
                    <span className="text-muted">Tipik kullanım:</span> {usageText}
                  </p>
                ) : null}
                <p>
                  <span className="text-muted">Kompozisyon rolü:</span> {staticProfile?.compositionRole || molecule.longevity_contribution}
                </p>
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <CardTitle>Bu Molekülü İçeren Parfümler</CardTitle>
              <div className="mt-4 flex flex-wrap gap-3">
                {(staticProfile?.fragrances || fragrances.slice(0, 6).map((fragrance) => `${fragrance.brand} · ${fragrance.name}`))
                  .slice(0, 6)
                  .map((fragrance) => (
                    <Link
                      key={fragrance}
                      href={`/?mode=text&q=${encodeURIComponent(fragrance.replace(' · ', ' '))}`}
                      className="rounded-[18px] border border-white/8 bg-white/[.03] px-4 py-3 text-[13px] text-cream transition-colors hover:border-[var(--gold-line)] hover:bg-white/[.05]"
                    >
                      {fragrance}
                    </Link>
                  ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
