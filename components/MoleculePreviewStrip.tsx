'use client';

import { useEffect, useState } from 'react';
import { MoleculeCard, type MoleculeData } from './MoleculeCard';
import { MoleculeVisual } from './MoleculeVisual';

const MOLECULE_POOL: MoleculeData[] = [
  {
    name: 'Ambroxide',
    formula: 'C16H28O',
    type: 'Amber • mineral • sıcak iz',
    note: 'base',
    origin: ['Amber akoru', 'Modern kalıcılık'],
    pct: 74,
    smiles: 'CC1(C)CCC2(C(C1)CCC3C2CC=C4C3(CCCC4(C)C)O)C',
    verified: true,
  },
  {
    name: 'Iso E Super',
    formula: 'C16H26O',
    type: 'Kadifemsi sedir • ten sıcaklığı',
    note: 'heart',
    origin: ['Odunsu iskelet', 'Difüzyon artışı'],
    pct: 68,
    smiles: 'CC1=CC[C@H](C(C)(C)O)CC1=O',
    verified: true,
  },
  {
    name: 'Hedione',
    formula: 'C13H22O3',
    type: 'Havadar yasemin • parlaklık',
    note: 'heart',
    origin: ['Beyaz çiçek izi', 'Açılım desteği'],
    pct: 62,
    smiles: 'CC(=O)CCC[C@H](C)C(=O)OCC',
    verified: true,
  },
  {
    name: 'Cashmeran',
    formula: 'C14H22O',
    type: 'Miskimsi odun • sıcak gövde',
    note: 'base',
    origin: ['Kaşmir akoru', 'Derin iz'],
    pct: 57,
    smiles: 'CC1(C)CC[C@@H](CC1)C(C)(C)O',
    verified: true,
  },
  {
    name: 'Galaxolide',
    formula: 'C18H26O',
    type: 'Temiz misk • yumuşak aura',
    note: 'base',
    origin: ['Misk dokusu', 'Ten etkisi'],
    pct: 54,
    smiles: 'CC1=CC(C)(C)CCC1(C)C2=CC(C)(C)CCO2',
    verified: true,
  },
  {
    name: 'Vanillin',
    formula: 'C8H8O3',
    type: 'Kremamsı vanilya • imza tatlılık',
    note: 'base',
    origin: ['Vanilya izi', 'Gourmand sıcaklık'],
    pct: 49,
    smiles: 'COC1=C(C=CC(=C1)C=O)O',
    verified: true,
  },
];

function pickFeaturedMolecules(): MoleculeData[] {
  const copy = [...MOLECULE_POOL];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy.slice(0, 3);
}

export function MoleculePreviewStrip() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [molecules, setMolecules] = useState<MoleculeData[]>(() => MOLECULE_POOL.slice(0, 3));

  useEffect(() => {
    setMolecules(pickFeaturedMolecules());
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % molecules.length);
    }, 2600);

    return () => window.clearInterval(timer);
  }, [molecules.length]);

  return (
    <section className="px-5 pb-6 md:px-12">
      <div className="mx-auto max-w-[920px]">
        <div className="mb-3 flex items-center gap-3">
          <div className="h-px w-10 bg-[var(--gold-line)]" />
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gold/80">
            Moleküler Önizleme
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {molecules.map((molecule, index) => {
            const active = index === activeIndex;
            return (
              <button
                key={molecule.name}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className={`group overflow-hidden rounded-[24px] border p-4 text-left transition-all duration-500 ${
                  active
                    ? 'border-[var(--gold-line)] bg-[linear-gradient(180deg,rgba(201,169,110,.10),rgba(255,255,255,.02))] shadow-[0_0_30px_rgba(201,169,110,.08)]'
                    : 'border-white/[.08] bg-white/[.025] hover:border-white/[.14]'
                }`}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-gold/75">
                      {active ? 'Öne çıkan molekül' : 'İmza yapı'}
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
              </button>
            );
          })}
        </div>
      </div>

      {selectedIndex !== null ? (
        <MoleculeCard
          molecules={molecules}
          initialIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
        />
      ) : null}
    </section>
  );
}
