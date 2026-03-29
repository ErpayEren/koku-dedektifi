export interface FragranceMolecule {
  smiles: string;
  formula: string;
  family: string;
  origin: string;
}

export interface FragranceNoteHints {
  top: string[];
  heart: string[];
  base: string[];
}

export interface FragranceData {
  smilesDb: Record<string, FragranceMolecule>;
  noteHints: FragranceNoteHints;
}

export const FRAGRANCE_DATA: FragranceData = {
  smilesDb: {
    Linalool: { smiles: 'OC(CC/C=C(/C)C)(C=C)C', formula: 'C10H18O', family: 'Monoterpen Alkol', origin: 'Lavanta, Kisnis' },
    Geraniol: { smiles: 'OC/C=C(/C)CCC=C(C)C', formula: 'C10H18O', family: 'Asiklik Monoterpen', origin: 'Gul, Palmarosa' },
    Citronellol: { smiles: 'OCC(CC)CCC=C(C)C', formula: 'C10H20O', family: 'Monoterpen Alkol', origin: 'Gul, Sardunya' },
    Menthol: { smiles: 'OC1CC(C)CCC1C(C)C', formula: 'C10H20O', family: 'Siklik Terpen', origin: 'Nane' },
    Vanillin: { smiles: 'O=Cc1ccc(O)c(OC)c1', formula: 'C8H8O3', family: 'Aromatik Aldehit', origin: 'Vanilya Orkidesi' },
    Citral: { smiles: 'O=C/C=C(/C)CCC=C(C)C', formula: 'C10H16O', family: 'Terpen Aldehit', origin: 'Limon Otu, Limon' },
    Damascenone: { smiles: 'O=C(/C=C/C1CC(C)(C)CC1=O)C', formula: 'C13H18O', family: 'Nor-isoprenoid', origin: 'Gul, Uzum' },
    Ionone: { smiles: 'O=C(/C=C/C1CC(C)=CCC1(C)C)C', formula: 'C13H20O', family: 'Nor-isoprenoid', origin: 'Menekse, Iris' },
    Safranal: { smiles: 'CC1=C(C(CC=C1)(C)C)C=O', formula: 'C10H14O', family: 'Terpen Aldehit', origin: 'Safran akoru' },
    Muscone: { smiles: 'O=C1CCCCCCCCCCCC(C)CC1', formula: 'C16H30O', family: 'Makrosiklik Keton', origin: 'Misk akoru' },
    LinalylAcetate: { smiles: 'CC(=O)OC(CC/C=C(/C)C)(C=C)C', formula: 'C12H20O2', family: 'Terpen Ester', origin: 'Bergamot, Lavanta' },
    BenzylAcetate: { smiles: 'CC(=O)OCc1ccccc1', formula: 'C9H10O2', family: 'Aromatik Ester', origin: 'Yasemin, Gardenia' },
    Eugenol: { smiles: 'C=CCc1ccc(O)c(OC)c1', formula: 'C10H12O2', family: 'Fenilpropanoid', origin: 'Karanfil, Feslegen' },
    Isoeugenol: { smiles: 'COc1cc(/C=C/C)ccc1O', formula: 'C10H12O2', family: 'Fenilpropanoid', origin: 'Karanfil, Muskat' },
    Guaiacol: { smiles: 'COc1ccccc1O', formula: 'C7H8O2', family: 'Metoksi Fenol', origin: 'Kavrulmus profil' },
    Ambroxide: { smiles: 'C1CC2(CCC1(C)O)CCCC(C)(C)O2', formula: 'C16H28O', family: 'Terpenoid Eter', origin: 'Ambra sentetik' },
    Galaxolide: { smiles: 'CC1(C)CC2CC(C)(C)c3cc(C)c(cc3)CC12', formula: 'C18H26O', family: 'Polisiklik Musk', origin: 'Sentetik musk' },
    Calone: { smiles: 'O=C1OCC2=CC=CC=C12', formula: 'C9H6O2', family: 'Laktonik Deniz', origin: 'Su akoru' },
    Limonene: { smiles: 'C1CCC(=CC1)C(C)=C', formula: 'C10H16', family: 'Siklik Monoterpen', origin: 'Portakal, Limon' },
    AlphaPinene: { smiles: 'CC1=CCC2(CC1)C2(C)C', formula: 'C10H16', family: 'Bisiklik Monoterpen', origin: 'Cam, Karacam' },
    Cedrene: { smiles: 'C1CC2(CCC1(C2)C(=C)C)C', formula: 'C15H24', family: 'Seskiterpen', origin: 'Sedir Agaci' },
    Nootkatone: { smiles: 'C[C@@H]1CC(=O)C=C2CC[C@H](C[C@@]12C)C(C)=C', formula: 'C15H22O', family: 'Seskiterpen Keton', origin: 'Greyfurt' },
    Indole: { smiles: 'c1ccc2[nH]ccc2c1', formula: 'C8H7N', family: 'Heterosiklik', origin: 'Yasemin, Cicek' },
    '2-Acetylpyrazine': { smiles: 'CC(=O)c1cnccn1', formula: 'C6H6N2O', family: 'Heterosiklik Keton', origin: 'Kahve, Kavrulmus' },
    Coumarin: { smiles: 'O=C1OC(=Cc2ccccc12)C', formula: 'C9H6O2', family: 'Lakton', origin: 'Benzoin, Ot' },
    Geosmin: { smiles: 'OC1(C)CCCC2(CC1)CCCC2C', formula: 'C12H22O', family: 'Bisiklik Terpen', origin: 'Islak Toprak' },
    PatchouliAlcohol: { smiles: 'OC12CC(CC(C1)(C)C)(C2)C(C)C', formula: 'C15H26O', family: 'Seskiterpen Alkol', origin: 'Paculi' },
    '2-Methylundecanal': { smiles: 'CCCCCCCCCC(C)C=O', formula: 'C12H24O', family: 'Alifatik Aldehit', origin: 'Aldehidik parfum akoru' },
    Irone: { smiles: 'O=C(/C=C/C1CC(=CC1)C)C', formula: 'C14H22O', family: 'Nor-isoprenoid', origin: 'Iris Koku' },
  },
  noteHints: {
    top: ['Limonene', 'AlphaPinene', 'Citral', 'Linalool', 'Hexenol', 'Carvone', '2-Acetylpyrazine'],
    heart: ['Geraniol', 'Eugenol', 'Damascenone', 'BenzylAcetate', 'LinalylAcetate', 'Ionone', 'Irone', 'Indole'],
    base: ['Vanillin', 'Muscone', 'Ambroxide', 'Cedrene', 'Galaxolide', 'PatchouliAlcohol', 'Coumarin', '2-Methylundecanal'],
  },
};

export function getFragranceData(): FragranceData {
  return FRAGRANCE_DATA;
}

