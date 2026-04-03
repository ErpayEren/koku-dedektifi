'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { useBillingEntitlement } from '@/lib/client/useBillingEntitlement';
import type { PublicMolecule } from '@/lib/catalog-public';
import { Card } from './ui/Card';
import { CardTitle } from './ui/CardTitle';

interface MoleculeRelatedRailProps {
  molecules: PublicMolecule[];
}

function evidenceTone(level: PublicMolecule['primary_evidence_level']): string {
  if (level === 'signature_molecule') return 'border-[#a78bfa]/35 bg-[#a78bfa]/12 text-[#cab8ff]';
  if (level === 'verified_component') return 'border-[var(--gold-line)] bg-[var(--gold-dim)]/15 text-gold';
  if (level === 'accord_component') return 'border-sage/35 bg-sage/10 text-sage';
  if (level === 'note_match') return 'border-white/12 bg-white/5 text-cream/82';
  return 'border-white/10 bg-white/5 text-muted';
}

export function MoleculeRelatedRail({ molecules }: MoleculeRelatedRailProps) {
  const entitlement = useBillingEntitlement();
  const visibleCount = entitlement.tier === 'pro' ? molecules.length : Math.min(2, molecules.length);
  const visibleMolecules = molecules.slice(0, visibleCount);
  const hiddenCount = Math.max(0, molecules.length - visibleMolecules.length);

  if (molecules.length === 0) return null;

  return (
    <Card className="p-5 sm:p-6" glow="purple">
      <CardTitle>Yakın Moleküller</CardTitle>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {visibleMolecules.map((molecule) => (
          <Link
            key={molecule.id}
            href={`/molekuller/${molecule.slug}`}
            className="rounded-[22px] border border-white/8 bg-white/[.03] p-4 transition-all duration-300 hover:border-[var(--gold-line)] hover:bg-white/[.05]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-[.12em] ${evidenceTone(molecule.primary_evidence_level)}`}>
                {molecule.primary_evidence_label}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[.12em] text-muted">
                {molecule.linked_fragrances_count} parfüm
              </span>
            </div>

            <h3 className="mt-3 text-[1.2rem] font-semibold leading-tight text-cream">{molecule.name}</h3>
            <p className="mt-2 text-[12px] leading-relaxed text-muted">{molecule.odor_description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {molecule.profile_tags.slice(0, 2).map((tag) => (
                <span
                  key={`${molecule.slug}-${tag}`}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[.12em] text-cream/80"
                >
                  {tag}
                </span>
              ))}
            </div>

            <p className="mt-3 text-[12px] leading-relaxed text-cream/78">
              {molecule.linked_fragrance_names.length > 0
                ? `Bu molekül şu parfümlerde bulunur: ${molecule.linked_fragrance_names.slice(0, 2).join(', ')}`
                : 'İkonik molekül olarak görünür; henüz savunulabilir parfüm bağı yok.'}
            </p>
          </Link>
        ))}

        {hiddenCount > 0 ? (
          <div className="relative overflow-hidden rounded-[22px] border border-[var(--gold-line)]/50 bg-[linear-gradient(180deg,rgba(167,139,250,0.08),rgba(13,13,18,0.96))] p-4">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] backdrop-blur-sm" />
            <div className="relative z-10 flex h-full min-h-[190px] flex-col items-center justify-center text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)]/20 text-gold">
                <Lock className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <p className="mt-4 text-[10px] font-mono uppercase tracking-[.18em] text-gold/80">PRO ile gör</p>
              <h3 className="mt-2 text-[1.2rem] font-semibold text-cream">{hiddenCount} molekül daha var</h3>
              <p className="mt-3 max-w-[24ch] text-[13px] leading-relaxed text-cream/78">
                Tam molekül keşfi ve ilişkili yapılar Pro katmanda tamamen açılır.
              </p>
              <Link
                href="/paketler"
                className="mt-5 inline-flex items-center rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)]/20 px-4 py-2 text-[10px] font-mono uppercase tracking-[.14em] text-gold transition-colors hover:bg-[var(--gold-dim)]/35"
              >
                PRO ile gör
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
