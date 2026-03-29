const { canonicalizeNote, normalizeText } = require('../note-ontology');

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

const ICON_TOKEN = {
  signature: 'signature',
  floral: 'floral',
  citrus: 'citrus',
  aquatic: 'aquatic',
  herb: 'herb',
  fruit: 'fruit',
  gourmand: 'gourmand',
  amber: 'amber',
  spicy: 'spicy',
  woody: 'woody',
  leather: 'leather',
  fresh: 'fresh',
  moss: 'moss',
  aromatic: 'aromatic',
};

const CANONICAL_NOTE_ICON = {
  magnolia: ICON_TOKEN.floral,
  jasmine: ICON_TOKEN.floral,
  rose: ICON_TOKEN.floral,
  iris: ICON_TOKEN.floral,
  lavender: ICON_TOKEN.floral,
  bergamot: ICON_TOKEN.citrus,
  lemon: ICON_TOKEN.citrus,
  orange: ICON_TOKEN.citrus,
  mandarin: ICON_TOKEN.citrus,
  grapefruit: ICON_TOKEN.citrus,
  'marine notes': ICON_TOKEN.aquatic,
  mint: ICON_TOKEN.herb,
  sage: ICON_TOKEN.herb,
  pineapple: ICON_TOKEN.fruit,
  apple: ICON_TOKEN.fruit,
  plum: ICON_TOKEN.fruit,
  blackcurrant: ICON_TOKEN.fruit,
  vanilla: ICON_TOKEN.gourmand,
  'tonka bean': ICON_TOKEN.gourmand,
  caramel: ICON_TOKEN.gourmand,
  amber: ICON_TOKEN.amber,
  musk: ICON_TOKEN.amber,
  saffron: ICON_TOKEN.spicy,
  pepper: ICON_TOKEN.spicy,
  clove: ICON_TOKEN.spicy,
  patchouli: ICON_TOKEN.woody,
  cedarwood: ICON_TOKEN.woody,
  sandalwood: ICON_TOKEN.woody,
  vetiver: ICON_TOKEN.woody,
  oakmoss: ICON_TOKEN.moss,
  truffle: ICON_TOKEN.gourmand,
  birch: ICON_TOKEN.woody,
  rum: ICON_TOKEN.gourmand,
  oud: ICON_TOKEN.woody,
  tobacco: ICON_TOKEN.leather,
};

const FAMILY_ICON = {
  ciceksi: ICON_TOKEN.floral,
  odunsu: ICON_TOKEN.woody,
  oryantal: ICON_TOKEN.spicy,
  taze: ICON_TOKEN.fresh,
  fougere: ICON_TOKEN.herb,
  chypre: ICON_TOKEN.moss,
  gourmand: ICON_TOKEN.gourmand,
  aromatik: ICON_TOKEN.aromatic,
};

function collectCanonicalNotes(result) {
  const notes = [];
  ['top', 'middle', 'base'].forEach((layer) => {
    const layerNotes = Array.isArray(result?.pyramid?.[layer]) ? result.pyramid[layer] : [];
    layerNotes.forEach((rawNote) => {
      const mapped = canonicalizeNote(rawNote);
      const canonical = cleanString(mapped?.canonical);
      if (canonical) notes.push(canonical);
    });
  });

  const mappedFromOntology = Array.isArray(result?.noteOntology?.mapped) ? result.noteOntology.mapped : [];
  mappedFromOntology.forEach((entry) => {
    const canonical = cleanString(entry?.canonical);
    if (canonical) notes.push(canonical);
  });

  return Array.from(new Set(notes.map((item) => normalizeText(item)).filter(Boolean)));
}

function resolvePremiumEmojiForResult(result) {
  const notes = collectCanonicalNotes(result);
  for (const note of notes) {
    if (CANONICAL_NOTE_ICON[note]) return CANONICAL_NOTE_ICON[note];
  }

  const family = normalizeText(result?.family);
  if (family && FAMILY_ICON[family]) return FAMILY_ICON[family];

  const rawToken = normalizeText(result?.emoji || result?.iconToken || '');
  if (rawToken && ICON_TOKEN[rawToken]) return ICON_TOKEN[rawToken];
  return ICON_TOKEN.signature;
}

module.exports = {
  resolvePremiumEmojiForResult,
};
