// molecules_smiles.js — Koku Dedektifi SMILES Veritabanı
// Elle koordinat yok. SmilesDrawer tüm çizimleri otomatik hesaplar.
// SMILES = Simplified Molecular Input Line Entry System (kimya standardı)

window.SMILES_DB = {
  // ── TERPENLER & ALKOLLER ──────────────────────────────────────
  'Linalool':        { smiles:'OC(CC/C=C(/C)C)(C=C)C',         formula:'C₁₀H₁₈O',  family:'Monoterpen Alkol',   origin:'Lavanta, Kişniş' },
  'Geraniol':        { smiles:'OC/C=C(/C)CCC=C(C)C',           formula:'C₁₀H₁₈O',  family:'Asiklik Monoterpen', origin:'Gül, Palmarosa' },
  'Citronellol':     { smiles:'OCC(CC)CCC=C(C)C',              formula:'C₁₀H₂₀O',  family:'Monoterpen Alkol',   origin:'Gül, Sardunya' },
  'Menthol':         { smiles:'OC1CC(C)CCC1C(C)C',             formula:'C₁₀H₂₀O',  family:'Siklik Terpen',      origin:'Nane' },
  'Alpha-Terpineol': { smiles:'OC1(CCC(=CC1)C)C(C)C',         formula:'C₁₀H₁₈O',  family:'Monoterpenoid',      origin:'Kajenput, Çaytree' },
  'Farnesol':        { smiles:'OC/C=C(/C)CC/C=C(/C)CCC=C(C)C', formula:'C₁₅H₂₆O',  family:'Seskiterpen',        origin:'Papatya, Gül' },
  'Nerolidol':       { smiles:'OC(CCC=C(C)C)(CC/C=C(/C)C)C=C', formula:'C₁₅H₂₆O',  family:'Seskiterpen',        origin:'Neroli, Çay Çiçeği' },
  'Bisabolol':       { smiles:'OC1(C)CCC(=CC1)C(C)CCC=C(C)C', formula:'C₁₅H₂₆O',  family:'Seskiterpen',        origin:'Papatya, Huş Ağacı' },

  // ── ALDEHİTLER & KETONLAR ─────────────────────────────────────
  'Vanillin':        { smiles:'O=Cc1ccc(O)c(OC)c1',           formula:'C₈H₈O₃',   family:'Aromatik Aldehit',   origin:'Vanilya Orkidesi' },
  'Ethyl Vanillin':  { smiles:'O=Cc1ccc(O)c(OCC)c1',          formula:'C₉H₁₀O₃',  family:'Aromatik Aldehit',   origin:'Sentetik Vanilya' },
  'Citral':          { smiles:'O=C/C=C(/C)CCC=C(C)C',         formula:'C₁₀H₁₆O',  family:'Terpen Aldehit',     origin:'Limon Otu, Limon' },
  'Citronellal':     { smiles:'O=CCC(CC)CCC=C(C)C',           formula:'C₁₀H₁₈O',  family:'Terpen Aldehit',     origin:'Citronella, Ökaliptüs' },
  'Benzaldehyde':    { smiles:'O=Cc1ccccc1',                  formula:'C₇H₆O',    family:'Aromatik Aldehit',   origin:'Acı Badem, Kiraz' },
  'Cinnamaldehyde':  { smiles:'O=C/C=C/c1ccccc1',             formula:'C₉H₈O',    family:'Fenilpropanoid',     origin:'Tarçın Ağacı' },
  'Damascenone':     { smiles:'O=C(/C=C/C1CC(C)(C)CC1=O)C',  formula:'C₁₃H₁₈O',  family:'Nor-isoprenoid',     origin:'Gül, Üzüm' },
  'Ionone':          { smiles:'O=C(/C=C/C1CC(C)=CCC1(C)C)C', formula:'C₁₃H₂₀O',  family:'Nor-isoprenoid',     origin:'Menekşe, İris' },
  'Safranal':        { smiles:'CC1=C(C(CC=C1)(C)C)C=O',      formula:'C10H14O',   family:'Terpen Aldehit',     origin:'Safran akoru' },
  'Muscone':         { smiles:'O=C1CCCCCCCCCCCC(C)CC1',       formula:'C₁₆H₃₀O',  family:'Makrosiklik Keton',  origin:'Misk Geyiği' },
  'Camphor':         { smiles:'O=C1CC2(C)CCC1(C)C2(C)C',     formula:'C₁₀H₁₆O',  family:'Bisiklik Keton',     origin:'Kafur Ağacı' },
  'Carvone':         { smiles:'O=C1CC(=CC(C1)C)C(=C)C',      formula:'C₁₀H₁₄O',  family:'Monoterpen Keton',   origin:'Kimyon, Spearmint' },

  // ── ESTERLER ──────────────────────────────────────────────────
  'Linalyl Acetate': { smiles:'CC(=O)OC(CC/C=C(/C)C)(C=C)C', formula:'C₁₂H₂₀O₂', family:'Terpen Ester',       origin:'Bergamot, Lavanta' },
  'Benzyl Acetate':  { smiles:'CC(=O)OCc1ccccc1',            formula:'C₉H₁₀O₂',  family:'Aromatik Ester',     origin:'Yasemin, Gardenia' },
  'Geranyl Acetate': { smiles:'CC(=O)OC/C=C(/C)CCC=C(C)C',  formula:'C₁₂H₂₀O₂', family:'Terpen Ester',       origin:'Kişniş, Palmarosa' },
  'Isoamyl Acetate': { smiles:'CC(=O)OCCC(C)C',              formula:'C₇H₁₄O₂',  family:'Ester',              origin:'Muz, Armut' },
  'Methyl Salicylate':{ smiles:'COC(=O)c1ccccc1O',           formula:'C₈H₈O₃',   family:'Aromatik Ester',     origin:'Kış Yeşili, Birch' },
  'Benzyl Benzoate': { smiles:'O=C(OCc1ccccc1)c1ccccc1',     formula:'C₁₄H₁₂O₂', family:'Aromatik Ester',     origin:'Benzoin, Tolu Balsamı' },
  'Amyl Salicylate': { smiles:'CCCCCOC(=O)c1ccccc1O',        formula:'C₁₂H₁₆O₃', family:'Aromatik Ester',     origin:'Sentetik — çiçeksi' },
  'Cinnamyl Alcohol':{ smiles:'OC/C=C/c1ccccc1',             formula:'C₉H₁₀O',   family:'Fenilpropanoid',     origin:'Tarçın, Balsam' },

  // ── FENOLLER & AROMATİKLER ────────────────────────────────────
  'Eugenol':         { smiles:'C=CCc1ccc(O)c(OC)c1',         formula:'C₁₀H₁₂O₂', family:'Fenilpropanoid',     origin:'Karanfil, Fesleğen' },
  'Isoeugenol':      { smiles:'COc1cc(/C=C/C)ccc1O',         formula:'C₁₀H₁₂O₂', family:'Fenilpropanoid',     origin:'Karanfil, Muskat' },
  'Guaiacol':        { smiles:'COc1ccccc1O',                  formula:'C₇H₈O₂',   family:'Metoksi Fenol',      origin:'Sigara Dumanı, Kavurma' },
  'Thymol':          { smiles:'Cc1ccc(C(C)C)c(O)c1',         formula:'C₁₀H₁₄O',  family:'Monoterpenfenol',    origin:'Kekik, Ajvain' },
  'Anethole':        { smiles:'COc1ccc(/C=C/C)cc1',          formula:'C₁₀H₁₂O',  family:'Fenilpropanoid',     origin:'Anason, Rezene' },
  'Phenylethanol':   { smiles:'OCCc1ccccc1',                  formula:'C₈H₁₀O',   family:'Aromatik Alkol',     origin:'Gül, Papatya' },
  'Hedione':         { smiles:'O=C(OC)CC1C(C(=O)CC1)CCCCC',  formula:'C13H22O3',  family:'Yaseminsi Ester',    origin:'Jasmine akoru - sentetik' },

  // ── MÜŞKİ & AMBER ─────────────────────────────────────────────
  'Ambroxide':       { smiles:'C1CC2(CCC1(C)O)CCCC(C)(C)O2', formula:'C₁₆H₂₈O',  family:'Terpenoid Eter',     origin:'Ambra — sentetik' },
  'Galaxolide':      { smiles:'CC1(C)CC2CC(C)(C)c3cc(C)c(cc3)CC12', formula:'C₁₈H₂₆O', family:'Polisiklik Müşk', origin:'Sentetik Müşk' },
  'Calone':          { smiles:'O=C1OCC2=CC=CC=C12',           formula:'C₉H₆O₂',   family:'Makrosiklik Lakton', origin:'Su Yosunu — deniz' },

  // ── TERPEN HİDROKARBONLAR ─────────────────────────────────────
  'Limonene':        { smiles:'C1CCC(=CC1)C(C)=C',            formula:'C₁₀H₁₆',   family:'Siklik Monoterpen',  origin:'Portakal, Limon' },
  'Alpha-Pinene':    { smiles:'CC1=CCC2(CC1)C2(C)C',          formula:'C₁₀H₁₆',   family:'Bisiklik Monoterpen',origin:'Çam, Karaçam' },
  'Cedrene':         { smiles:'C1CC2(CCC1(C2)C(=C)C)C',       formula:'C₁₅H₂₄',   family:'Seskiterpen',        origin:'Sedir Ağacı' },
  'Nootkatone':      { smiles:'C[C@@H]1CC(=O)C=C2CC[C@H](C[C@@]12C)C(C)=C', formula:'C15H22O', family:'Seskiterpen Keton', origin:'Greyfurt, pomelo' },

  // ── AZOTLU BİLEŞİKLER ─────────────────────────────────────────
  'Indole':          { smiles:'c1ccc2[nH]ccc2c1',             formula:'C₈H₇N',    family:'Heterosiklik',       origin:'Yasemin, Çiçek' },
  '2-Acetylpyrazine':{ smiles:'CC(=O)c1cnccn1',               formula:'C₆H₆N₂O',  family:'Heterosiklik Keton', origin:'Kahve, Kavrulmuş' },

  // ── DIĞER ─────────────────────────────────────────────────────
  'Coumarin':        { smiles:'O=C1OC(=Cc2ccccc12)C',         formula:'C₉H₆O₂',   family:'Lakton',             origin:'Benzoin, Ot' },
  'Hydroxycitronellal':{ smiles:'OC(CCC(CC)CC=O)C',           formula:'C₁₀H₂₀O₂', family:'Terpen Aldehit',     origin:'Mügra — sentetik' },
  'Dihydromyrcenol': { smiles:'OCC(C)(C)CCC=C(C)C',           formula:'C₁₀H₂₀O',  family:'Terpen Alkol',       origin:'Sentetik Taze' },
  'Hexenol':         { smiles:'OCC/C=C\\CC',                  formula:'C₆H₁₂O',   family:'Yeşil Alkol',        origin:'Çimen, Yaprak' },
  'Geosmin':         { smiles:'OC1(C)CCCC2(CC1)CCCC2C',       formula:'C₁₂H₂₂O',  family:'Bisiklik Terpen',    origin:'Islak Toprak' },
  'Patchouli Alcohol':{ smiles:'OC12CC(CC(C1)(C)C)(C2)C(C)C', formula:'C₁₅H₂₆O',  family:'Seskiterpen Alkol',  origin:'Paçuli Bitkisi' },
  'Alpha-Santalol':  { smiles:'OC/C=C/CC1CC(=C)CC1(C)C',     formula:'C₁₅H₂₄O',  family:'Seskiterpen',        origin:'Sandal Ağacı' },
  'Cedrol':          { smiles:'OC12CCCC(C1)(C)CC(CC2C)(C)C',  formula:'C₁₅H₂₆O',  family:'Seskiterpen Alkol',  origin:'Sedir Yağı' },
  'Furfurylthiol':   { smiles:'SCc1ccco1',                    formula:'C₅H₆OS',   family:'Tiyol',              origin:'Kahve, Kavrulmuş' },
  'Methyl Ionone':   { smiles:'O=C(/C=C/C1CC(C)=CCC1(C)C)C', formula:'C₁₄H₂₂O',  family:'Nor-isoprenoid',     origin:'Menekşe — sentetik' },
  'Nonanal':         { smiles:'O=CCCCCCCCC',                  formula:'C₉H₁₈O',   family:'Yağlı Aldehit',      origin:'Gül, Portakal Çiçeği' },
  '2-Methylundecanal':{ smiles:'CCCCCCCCCC(C)C=O',            formula:'C12H24O',   family:'Alifatik Aldehit',    origin:'Aldehidik parfum akoru' },
  'Vetiverol':       { smiles:'OC1(C)CC(=C)CC1CC/C=C(/C)CO', formula:'C₁₅H₂₄O',  family:'Seskiterpen',        origin:'Vetiver Kökü' },
  'Dihydrojasmone':  { smiles:'O=C1CC(CCCC)CC1=O',            formula:'C₁₁H₁₈O',  family:'Siklopentanon',      origin:'Yasemin — sentetik' },
  'Benzyl Alcohol':  { smiles:'OCc1ccccc1',                   formula:'C₇H₈O',    family:'Aromatik Alkol',     origin:'Yasemin, Tuberose' },
  'Irone':           { smiles:'O=C(/C=C/C1CC(=CC1)C)C',      formula:'C₁₄H₂₂O',  family:'Nor-isoprenoid',     origin:'İris Kökü' },
};

// SMILES → nota bilgisi eşleştirme (AI yoksa fallback)
window.MOLECULE_NOTE_HINTS = {
  top:   ['Limonene','Alpha-Pinene','Citral','Linalool','Bergapten','Hexenol','Carvone','2-Acetylpyrazine'],
  heart: ['Geraniol','Eugenol','Damascenone','Benzyl Acetate','Linalyl Acetate','Ionone','Irone','Indole','Phenylethanol','Cinnamaldehyde','Hedione'],
  base:  ['Vanillin','Muscone','Ambroxide','Cedrene','Galaxolide','Patchouli Alcohol','Coumarin','Benzyl Benzoate','Vetiverol','Cedrol','Alpha-Santalol','Safranal','Nootkatone','2-Methylundecanal'],
};
