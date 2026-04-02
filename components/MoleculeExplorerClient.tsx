'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { PublicMolecule } from '@/lib/catalog-public';
import { fadeUp, scaleIn, staggerChildren } from '@/lib/animations';
import { MoleculeVisual } from './MoleculeVisual';
import { Card } from './ui/Card';
import { CardTitle } from './ui/CardTitle';

interface MoleculeExplorerClientProps {
  molecules: PublicMolecule[];
}

type IntensityFilter = 'all' | 'subtle' | 'moderate' | 'powerful';
type SourceFilter = 'all' | 'Doğal' | 'Sentetik';
type PositionFilter = 'all' | 'top' | 'heart' | 'base' | 'structure';

function buildSearchText(molecule: PublicMolecule): string {
  return [
    molecule.name,
    molecule.iupac_name,
    molecule.odor_description,
    molecule.natural_source,
    molecule.families.join(' '),
    molecule.profile_tags.join(' '),
  ]
    .join(' ')
    .toLowerCase();
}

function intensityLabel(value: PublicMolecule['odor_intensity']): string {
  if (value === 'subtle') return 'Nazik';
  if (value === 'moderate') return 'Dengeli';
  return 'Güçlü';
}

function roleLabel(value: PublicMolecule['longevity_contribution']): string {
  if (value === 'top') return 'Üst nota';
  if (value === 'heart') return 'Kalp notası';
  if (value === 'base') return 'Derin iz';
  return 'Yapısal taşıyıcı';
}

export function MoleculeExplorerClient({ molecules }: MoleculeExplorerClientProps) {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('all');
  const [intensity, setIntensity] = useState<IntensityFilter>('all');
  const [sourceType, setSourceType] = useState<SourceFilter>('all');
  const [position, setPosition] = useState<PositionFilter>('all');

  const families = useMemo(() => {
    return Array.from(new Set(molecules.flatMap((molecule) => molecule.families))).sort((left, right) =>
      left.localeCompare(right, 'tr'),
    );
  }, [molecules]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return molecules.filter((molecule) => {
      if (normalizedQuery && !buildSearchText(molecule).includes(normalizedQuery)) return false;
      if (family !== 'all' && !molecule.families.includes(family as PublicMolecule['families'][number])) return false;
      if (intensity !== 'all' && molecule.odor_intensity !== intensity) return false;
      if (sourceType !== 'all' && molecule.source_type !== sourceType) return false;
      if (position !== 'all' && molecule.longevity_contribution !== position) return false;
      return true;
    });
  }, [family, intensity, molecules, position, query, sourceType]);

  return (
    <motion.div
      className="grid grid-cols-1 gap-5 px-4 py-4 sm:px-6 sm:py-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8 lg:py-6"
      initial={fadeUp.initial}
      animate={fadeUp.animate}
      transition={fadeUp.transition}
    >
      <motion.div variants={scaleIn} initial="initial" animate="animate">
        <Card className="h-fit p-5 sm:p-6">
        <CardTitle>Molekül filtreleri</CardTitle>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-2 block text-[10px] font-mono uppercase tracking-[0.14em] text-muted">
              Ara
            </label>
            <input
              data-testid="molecule-search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ambroxide, rose, amber..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-sm text-cream outline-none transition-colors focus:border-[var(--gold-line)]"
            />
          </div>

          <FilterGroup
            label="Koku ailesi"
            value={family}
            onChange={setFamily}
            options={['all', ...families]}
            allLabel="Hepsi"
          />

          <FilterGroup
            label="Yoğunluk"
            value={intensity}
            onChange={(value) => setIntensity(value as IntensityFilter)}
            options={['all', 'subtle', 'moderate', 'powerful']}
            labels={{
              all: 'Hepsi',
              subtle: 'Nazik',
              moderate: 'Dengeli',
              powerful: 'Güçlü',
            }}
          />

          <FilterGroup
            label="Kaynak"
            value={sourceType}
            onChange={(value) => setSourceType(value as SourceFilter)}
            options={['all', 'Doğal', 'Sentetik']}
            allLabel="Hepsi"
          />

          <FilterGroup
            label="Piramit pozisyonu"
            value={position}
            onChange={(value) => setPosition(value as PositionFilter)}
            options={['all', 'top', 'heart', 'base', 'structure']}
            labels={{
              all: 'Hepsi',
              top: 'Üst nota',
              heart: 'Kalp notası',
              base: 'Derin iz',
              structure: 'Yapısal',
            }}
          />
        </div>
        </Card>
      </motion.div>

      <motion.div variants={scaleIn} initial="initial" animate="animate">
        <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <CardTitle>Molekül kataloğu</CardTitle>
            <p className="mt-2 text-sm text-muted">
              Koku ailesi, yoğunluk ve piramit rolüne göre molekülleri keşfet.
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.12em] text-gold">
            <span data-testid="molecule-results-count">{filtered.length}</span> sonuç
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-[24px] border border-white/8 bg-white/[.03] px-4 py-6 text-sm text-muted">
            Arama ve filtreleri biraz gevşet; bu kombinasyonda eşleşen molekül bulunamadı.
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
            variants={staggerChildren}
            initial="initial"
            animate="animate"
          >
            {filtered.map((molecule) => (
              <motion.div key={molecule.id} variants={scaleIn}>
                <Link
                  href={`/molekuller/${molecule.slug}`}
                  className="group block rounded-[24px] border border-white/8 bg-white/[.03] p-4 transition-all duration-300 hover:border-[var(--gold-line)] hover:bg-white/[.05]"
                >
                  <MoleculeVisual
                    name={molecule.name}
                    smiles={molecule.smiles}
                    formula={molecule.iupac_name}
                    compact
                    className="pointer-events-none"
                  />

                  <div className="mt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-[1.15rem] font-semibold text-cream">{molecule.name}</h2>
                        <p className="mt-1 text-[12px] leading-relaxed text-muted">{molecule.odor_description}</p>
                      </div>
                      <span className="rounded-full border border-sage/25 bg-sage/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.12em] text-sage">
                        {molecule.found_in_fragrances.length}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.12em] text-gold">
                        {intensityLabel(molecule.odor_intensity)}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.12em] text-muted">
                        {roleLabel(molecule.longevity_contribution)}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.12em] text-muted">
                        {molecule.source_type}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {molecule.families.slice(0, 3).map((entry) => (
                        <span
                          key={`${molecule.slug}-${entry}`}
                          className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1 text-[11px] text-cream/80"
                        >
                          {entry}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
        </Card>
      </motion.div>
    </motion.div>
  );
}

interface FilterGroupProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  allLabel?: string;
  labels?: Record<string, string>;
}

function FilterGroup({ label, value, onChange, options, allLabel = 'Hepsi', labels }: FilterGroupProps) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.14em] text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option;
          const display = labels?.[option] ?? (option === 'all' ? allLabel : option);
          return (
            <button
              key={`${label}-${option}`}
              type="button"
              onClick={() => onChange(option)}
              className={`rounded-full border px-3 py-2 text-[11px] font-mono uppercase tracking-[0.12em] transition-colors ${
                active
                  ? 'border-[var(--gold-line)] bg-[var(--gold-dim)]/20 text-gold'
                  : 'border-white/10 bg-white/5 text-muted hover:border-white/20 hover:text-cream'
              }`}
            >
              {display}
            </button>
          );
        })}
      </div>
    </div>
  );
}
