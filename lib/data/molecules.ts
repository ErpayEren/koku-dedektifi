export interface MoleculeStaticProfile {
  name: string;
  formula: string;
  family: string;
  intensity: string;
  naturalSource: string;
  typicalConcentration: string;
  compositionRole: string;
  fragrances: string[];
}

export const MOLECULE_STATIC_DATA: Record<string, MoleculeStaticProfile> = {
  ambroxide: {
    name: 'Ambroxide',
    formula: 'C16H28O',
    family: 'Ambergris',
    intensity: 'Güçlü',
    naturalSource: 'Ambergris rekonstrüksiyonu',
    typicalConcentration: '%0.1 - 3',
    compositionRole: 'base',
    fragrances: ['Dior Sauvage Eau de Parfum', 'Baccarat Rouge 540 Eau de Parfum', 'Creed Aventus'],
  },
  'iso-e-super': {
    name: 'Iso E Super',
    formula: 'C16H26O',
    family: 'Woody amber',
    intensity: 'Orta - güçlü',
    naturalSource: 'Sentetik aroma kimyasalı',
    typicalConcentration: '%1 - 20',
    compositionRole: 'heart/base',
    fragrances: ['Molecule 01', 'Terre d’Hermès', 'Escentric 01'],
  },
  hedione: {
    name: 'Hedione',
    formula: 'C13H22O3',
    family: 'Jasmine diffusion',
    intensity: 'Orta',
    naturalSource: 'Sentetik yasemin difüzörü',
    typicalConcentration: '%0.5 - 10',
    compositionRole: 'heart',
    fragrances: ['Eau Sauvage', 'Baccarat Rouge 540 Eau de Parfum', 'Libre Eau de Parfum'],
  },
  'rose-oxide': {
    name: 'Rose Oxide',
    formula: 'C10H18O',
    family: 'Rosy metallic',
    intensity: 'Güçlü',
    naturalSource: 'Gül yağı iz molekülü',
    typicalConcentration: '%0.1 - 2',
    compositionRole: 'heart',
    fragrances: ['Portrait of a Lady', 'Delina', 'Rose 31'],
  },
  limonene: {
    name: 'Limonene',
    formula: 'C10H16',
    family: 'Citrus terpene',
    intensity: 'Canlı',
    naturalSource: 'Narenciye kabukları',
    typicalConcentration: '%0.5 - 8',
    compositionRole: 'top',
    fragrances: ['Creed Aventus', 'Acqua di Giò Eau de Parfum', 'Dior Homme Cologne'],
  },
};

export function getStaticMoleculeProfile(slug: string) {
  return MOLECULE_STATIC_DATA[slug] || null;
}
