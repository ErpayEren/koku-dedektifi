import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { MoleculeVisual } from '@/components/MoleculeVisual';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { getPublicFragrancesForMolecule, getPublicMoleculeBySlug } from '@/lib/catalog-public';

interface MoleculeDetailPageProps {
  params: Promise<{ slug: string }>;
}

function intensityDots(level: 'subtle' | 'moderate' | 'powerful'): number {
  if (level === 'subtle') return 2;
  if (level === 'moderate') return 4;
  return 5;
}

function intensityLabel(level: 'subtle' | 'moderate' | 'powerful'): string {
  if (level === 'subtle') return 'Nazik';
  if (level === 'moderate') return 'Dengeli';
  return 'Güçlü';
}

function roleLabel(value: string): string {
  if (value === 'top') return 'Üst nota';
  if (value === 'heart') return 'Kalp notası';
  if (value === 'base') return 'Derin iz';
  return 'Yapısal taşıyıcı';
}

function roleBadgeTone(value: string): string {
  if (value === 'top') return 'text-gold border-[var(--gold-line)] bg-[var(--gold-dim)]/15';
  if (value === 'heart') return 'text-[#a78bfa] border-[#a78bfa]/35 bg-[#a78bfa]/10';
  if (value === 'base') return 'text-sage border-sage/35 bg-sage/10';
  return 'text-cream/80 border-white/10 bg-white/5';
}

export default async function MoleculeDetailPage({ params }: MoleculeDetailPageProps) {
  const { slug } = await params;
  const molecule = getPublicMoleculeBySlug(slug);

  if (!molecule) {
    notFound();
  }

  const fragrances = getPublicFragrancesForMolecule(molecule.slug);
  const activeDots = intensityDots(molecule.odor_intensity);

  return (
    <AppShell>
      <TopBar title={molecule.name} />
      <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="mx-auto max-w-[1160px] space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/notalar"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-mono uppercase tracking-[.14em] text-muted transition-colors hover:border-[var(--gold-line)] hover:text-cream"
            >
              ← Molekül keşfine dön
            </Link>
            <div className="rounded-full border border-white/8 bg-white/4 px-3 py-2 text-[11px] font-mono uppercase tracking-[.12em] text-gold">
              CAS: {molecule.cas_number || 'Katalog notu yok'}
            </div>
          </div>

          <Card className="overflow-hidden p-5 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:items-start">
              <div>
                <CardTitle>{molecule.name}</CardTitle>
                <p className="mt-3 text-[13px] font-mono uppercase tracking-[.12em] text-muted">
                  {molecule.iupac_name}
                </p>

                <div className="mt-6">
                  <MoleculeVisual
                    name={molecule.name}
                    smiles={molecule.smiles}
                    formula={molecule.iupac_name}
                    className="min-h-[360px]"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Card className="p-5">
                  <CardTitle>Koku Profili</CardTitle>
                  <div className="mt-3 flex items-center gap-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <span
                        key={`dot-${index}`}
                        className={`h-2.5 w-2.5 rounded-full ${
                          index < activeDots ? 'bg-gold shadow-[0_0_10px_rgba(245,158,11,.35)]' : 'bg-white/12'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm text-cream/90">
                      Yoğunluk: <span className="font-semibold">{intensityLabel(molecule.odor_intensity)}</span>
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {molecule.profile_tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-cream/85"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {molecule.families.map((family) => (
                      <span
                        key={family}
                        className="rounded-full border border-sage/30 bg-sage/10 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[.12em] text-sage"
                      >
                        {family}
                      </span>
                    ))}
                    <span
                      className={`rounded-full border px-3 py-1.5 text-[10px] font-mono uppercase tracking-[.12em] ${roleBadgeTone(
                        molecule.longevity_contribution,
                      )}`}
                    >
                      {roleLabel(molecule.longevity_contribution)}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[.12em] text-muted">
                      {molecule.source_type}
                    </span>
                  </div>
                </Card>

                <Card className="p-5">
                  <CardTitle>Biliyor muydun?</CardTitle>
                  <p className="mt-3 text-[15px] leading-relaxed text-cream/92">{molecule.fun_fact}</p>

                  <div className="mt-4 rounded-2xl border border-white/8 bg-black/10 p-4">
                    <p className="text-[10px] font-mono uppercase tracking-[.14em] text-muted">Doğal kaynak</p>
                    <p className="mt-2 text-[14px] text-cream/90">{molecule.natural_source}</p>

                    <p className="mt-3 text-[10px] font-mono uppercase tracking-[.14em] text-muted">
                      Tipik kullanım
                    </p>
                    <p className="mt-2 text-[14px] text-cream/90">
                      %{molecule.usage_percentage_typical} · {roleLabel(molecule.longevity_contribution)}
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <CardTitle>Bu Molekülü İçeren Parfümler</CardTitle>
            {fragrances.length > 0 ? (
              <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
                {fragrances.map((fragrance) => {
                  const moleculeRef = fragrance.key_molecules.find((entry) => entry.slug === molecule.slug);
                  return (
                    <Link
                      key={fragrance.id}
                      href={`/?mode=text&q=${encodeURIComponent(`${fragrance.brand} ${fragrance.name}`)}`}
                      className="min-w-[260px] rounded-[24px] border border-white/8 bg-white/[.03] p-4 transition-all duration-300 hover:border-[var(--gold-line)] hover:bg-white/[.05]"
                    >
                      <p className="text-[11px] font-mono uppercase tracking-[.12em] text-gold/75">
                        {fragrance.brand}
                      </p>
                      <h2 className="mt-2 text-[1.45rem] font-semibold leading-[1.02] text-cream">
                        {fragrance.name}
                      </h2>
                      <p className="mt-3 text-[12px] text-muted">
                        {fragrance.character_tags.slice(0, 3).join(' · ') || 'Karakter notu yakında'}
                      </p>
                      <div className="mt-4 flex items-center justify-between text-[11px] font-mono uppercase tracking-[.1em] text-muted">
                        <span>{fragrance.concentration}</span>
                        <span className="text-sage">{moleculeRef?.percentage ?? 0}% katkı</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-[13px] text-muted">
                Bu molekül henüz katalogdaki parfümlerle eşleşmedi.
              </p>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
