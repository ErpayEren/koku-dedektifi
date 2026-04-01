'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { getFeaturedMolecules } from '@/lib/catalog-public';
import { fadeUp, scaleIn, staggerChildren } from '@/lib/animations';
import { MoleculeCard, type MoleculeData } from './MoleculeCard';
import { MoleculeVisual } from './MoleculeVisual';

function buildPreviewExplanation(type: string, profileTags: string[]): string {
  const tags = profileTags.slice(0, 2).join(' · ');
  if (tags) {
    return `${type} çizgisini ${tags.toLowerCase()} karakteriyle görünür kılar.`;
  }
  return `${type} etkisini parfüm iskeletinde daha net hissettirir.`;
}

export function MoleculePreviewStrip() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const molecules = useMemo<MoleculeData[]>(
    () =>
      getFeaturedMolecules().map((item) => ({
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
        explanation: buildPreviewExplanation(item.odor_description, item.profile_tags),
      })),
    [],
  );

  useEffect(() => {
    if (molecules.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % molecules.length);
    }, 2600);

    return () => window.clearInterval(timer);
  }, [molecules.length]);

  return (
    <motion.section
      className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6"
      initial={fadeUp.initial}
      animate={fadeUp.animate}
      transition={fadeUp.transition}
    >
      <div className="mx-auto max-w-[920px]">
        <div className="mb-3 flex items-center gap-3">
          <div className="h-px w-10 bg-[var(--gold-line)]" />
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gold/80">
            Moleküler önizleme
          </p>
        </div>

        <motion.div
          className="grid grid-cols-1 gap-3 md:grid-cols-3"
          variants={staggerChildren}
          initial="initial"
          animate="animate"
        >
          {molecules.map((molecule, index) => {
            const active = index === activeIndex;
            return (
              <motion.button
                key={molecule.name}
                type="button"
                onClick={() => setSelectedIndex(index)}
                variants={scaleIn}
                className={`group overflow-hidden rounded-[24px] border p-4 text-left transition-all duration-500 ${
                  active
                    ? 'border-[var(--gold-line)] bg-[linear-gradient(180deg,rgba(201,169,110,.10),rgba(255,255,255,.02))] shadow-[0_0_30px_rgba(201,169,110,.08)]'
                    : 'border-white/[.08] bg-white/[.025] hover:border-white/[.14]'
                }`}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-gold/75">
                      {active ? 'İkonik molekül' : 'Molekül kartı'}
                    </p>
                    <h3 className="mt-2 text-[1.35rem] font-semibold leading-none text-cream">
                      {molecule.name}
                    </h3>
                  </div>
                  <span
                    className={`h-2.5 w-2.5 rounded-full transition-all duration-500 ${
                      active ? 'bg-gold shadow-[0_0_14px_rgba(201,169,110,.45)]' : 'bg-white/20'
                    }`}
                  />
                </div>

                <MoleculeVisual
                  name={molecule.name}
                  smiles={molecule.smiles}
                  formula={molecule.formula}
                  compact
                  className="pointer-events-none"
                />

                <p className="mt-4 text-[13px] leading-relaxed text-muted">{molecule.type}</p>
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {selectedIndex !== null ? (
        <MoleculeCard
          molecules={molecules}
          initialIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
        />
      ) : null}
    </motion.section>
  );
}
