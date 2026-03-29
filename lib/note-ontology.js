function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeText(value) {
  return cleanString(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const NOTE_ONTOLOGY = [
  { canonical: 'bergamot', display: 'Bergamot', family: 'Narenciye', cluster: 'Citrus', layerHint: 'top', synonyms: ['bergamot', 'bergamote', 'calabrian bergamot'] },
  { canonical: 'lemon', display: 'Limon', family: 'Narenciye', cluster: 'Citrus', layerHint: 'top', synonyms: ['lemon', 'limon', 'limon kabugu'] },
  { canonical: 'orange', display: 'Portakal', family: 'Narenciye', cluster: 'Citrus', layerHint: 'top', synonyms: ['orange', 'portakal', 'sweet orange'] },
  { canonical: 'mandarin', display: 'Mandalina', family: 'Narenciye', cluster: 'Citrus', layerHint: 'top', synonyms: ['mandarin', 'mandalina', 'green mandarin'] },
  { canonical: 'grapefruit', display: 'Greyfurt', family: 'Narenciye', cluster: 'Citrus', layerHint: 'top', synonyms: ['grapefruit', 'greyfurt'] },
  { canonical: 'lavender', display: 'Lavanta', family: 'Aromatik', cluster: 'Aromatic', layerHint: 'top', synonyms: ['lavender', 'lavanta', 'lavandin'] },
  { canonical: 'sage', display: 'Ada Cayi', family: 'Aromatik', cluster: 'Aromatic', layerHint: 'middle', synonyms: ['sage', 'ada cayi', 'clary sage'] },
  { canonical: 'mint', display: 'Nane', family: 'Aromatik', cluster: 'Aromatic', layerHint: 'top', synonyms: ['mint', 'nane', 'peppermint'] },
  { canonical: 'jasmine', display: 'Yasemin', family: 'Ciceksi', cluster: 'Floral', layerHint: 'middle', synonyms: ['jasmine', 'yasemin'] },
  { canonical: 'rose', display: 'Gul', family: 'Ciceksi', cluster: 'Floral', layerHint: 'middle', synonyms: ['rose', 'gul', 'may rose', 'damask rose'] },
  { canonical: 'magnolia', display: 'Manolya', family: 'Ciceksi', cluster: 'Floral', layerHint: 'middle', synonyms: ['magnolia', 'manolya'] },
  { canonical: 'cherry blossom', display: 'Sakura', family: 'Ciceksi', cluster: 'Floral', layerHint: 'middle', synonyms: ['cherry blossom', 'sakura'] },
  { canonical: 'orange blossom', display: 'Portakal Cicegi', family: 'Ciceksi', cluster: 'Floral', layerHint: 'middle', synonyms: ['orange blossom', 'portakal cicegi', 'neroli'] },
  { canonical: 'ylang ylang', display: 'Ylang Ylang', family: 'Ciceksi', cluster: 'Floral', layerHint: 'middle', synonyms: ['ylang', 'ylang ylang'] },
  { canonical: 'iris', display: 'Iris', family: 'Ciceksi', cluster: 'Floral', layerHint: 'middle', synonyms: ['iris', 'orris', 'susen'] },
  { canonical: 'patchouli', display: 'Patchouli', family: 'Odunsu', cluster: 'Woody', layerHint: 'base', synonyms: ['patchouli', 'paculi', 'pacouli'] },
  { canonical: 'cedarwood', display: 'Sedir', family: 'Odunsu', cluster: 'Woody', layerHint: 'base', synonyms: ['cedar', 'cedarwood', 'sedir'] },
  { canonical: 'sandalwood', display: 'Sandal', family: 'Odunsu', cluster: 'Woody', layerHint: 'base', synonyms: ['sandalwood', 'sandal', 'santal'] },
  { canonical: 'oud', display: 'Oud', family: 'Odunsu', cluster: 'Woody', layerHint: 'base', synonyms: ['oud', 'agarwood', 'ud'] },
  { canonical: 'cashmeran', display: 'Cashmeran', family: 'Odunsu', cluster: 'Woody', layerHint: 'base', synonyms: ['cashmeran', 'cashmere wood'] },
  { canonical: 'vetiver', display: 'Vetiver', family: 'Odunsu', cluster: 'Woody', layerHint: 'base', synonyms: ['vetiver'] },
  { canonical: 'oakmoss', display: 'Meseyosunu', family: 'Mossy', cluster: 'Mossy', layerHint: 'base', synonyms: ['oakmoss', 'moss', 'meseyosunu', 'mese yosunu'] },
  { canonical: 'vanilla', display: 'Vanilya', family: 'Gourmand', cluster: 'Gourmand', layerHint: 'base', synonyms: ['vanilla', 'vanilya'] },
  { canonical: 'tonka bean', display: 'Tonka', family: 'Gourmand', cluster: 'Gourmand', layerHint: 'base', synonyms: ['tonka', 'tonka bean'] },
  { canonical: 'caramel', display: 'Karamel', family: 'Gourmand', cluster: 'Gourmand', layerHint: 'base', synonyms: ['caramel', 'karamel'] },
  { canonical: 'praline', display: 'Pralin', family: 'Gourmand', cluster: 'Gourmand', layerHint: 'base', synonyms: ['praline', 'pralin'] },
  { canonical: 'coffee', display: 'Kahve', family: 'Gourmand', cluster: 'Gourmand', layerHint: 'base', synonyms: ['coffee', 'kahve'] },
  { canonical: 'amber', display: 'Amber', family: 'Resinous', cluster: 'Amber', layerHint: 'base', synonyms: ['amber', 'amberwood', 'amber accord', 'ambroxan', 'ambergris'] },
  { canonical: 'musk', display: 'Misk', family: 'Musky', cluster: 'Musky', layerHint: 'base', synonyms: ['musk', 'misk', 'white musk'] },
  { canonical: 'saffron', display: 'Safran', family: 'Spicy', cluster: 'Spicy', layerHint: 'top', synonyms: ['saffron', 'safran'] },
  { canonical: 'pepper', display: 'Biber', family: 'Spicy', cluster: 'Spicy', layerHint: 'top', synonyms: ['pepper', 'pink pepper', 'karabiber', 'biber'] },
  { canonical: 'clove', display: 'Karanfil', family: 'Spicy', cluster: 'Spicy', layerHint: 'middle', synonyms: ['clove', 'karanfil'] },
  { canonical: 'pineapple', display: 'Ananas', family: 'Meyvemsi', cluster: 'Fruity', layerHint: 'top', synonyms: ['pineapple', 'ananas'] },
  { canonical: 'apple', display: 'Elma', family: 'Meyvemsi', cluster: 'Fruity', layerHint: 'top', synonyms: ['apple', 'elma'] },
  { canonical: 'plum', display: 'Erik', family: 'Meyvemsi', cluster: 'Fruity', layerHint: 'middle', synonyms: ['plum', 'erik'] },
  { canonical: 'blackcurrant', display: 'Frenk Uzumu', family: 'Meyvemsi', cluster: 'Fruity', layerHint: 'top', synonyms: ['blackcurrant', 'cassis', 'frenk uzumu'] },
  { canonical: 'marine notes', display: 'Deniz Notalari', family: 'Aromatik', cluster: 'Aquatic', layerHint: 'top', synonyms: ['marine notes', 'aquatic', 'ozonic', 'deniz notalari'] },
  { canonical: 'truffle', display: 'Truf', family: 'Topraksi', cluster: 'Earthy', layerHint: 'middle', synonyms: ['truffle', 'truf'] },
  { canonical: 'birch', display: 'Hus', family: 'Odunsu', cluster: 'Woody', layerHint: 'base', synonyms: ['birch', 'hus'] },
  { canonical: 'rum', display: 'Rom', family: 'Baharatli', cluster: 'Spicy', layerHint: 'base', synonyms: ['rum', 'rom'] },
  { canonical: 'tobacco', display: 'Tutun', family: 'Topraksi', cluster: 'Earthy', layerHint: 'base', synonyms: ['tobacco', 'tutun'] },
];

const NOTE_LOOKUP = new Map();
const ONTOLOGY_BY_CANONICAL = new Map();
NOTE_ONTOLOGY.forEach((entry) => {
  ONTOLOGY_BY_CANONICAL.set(entry.canonical, entry);
  [entry.canonical, entry.display, ...(entry.synonyms || [])].forEach((alias) => {
    const normalized = normalizeText(alias);
    if (!normalized) return;
    NOTE_LOOKUP.set(normalized, entry.canonical);
  });
});

function dedupeStrings(items, limit = 48) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const value = cleanString(item);
    const key = normalizeText(value);
    if (!value || !key || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}

function splitNoteCandidates(text) {
  return cleanString(text)
    .replace(/[•]/g, ',')
    .replace(/\s+\|\s+/g, ',')
    .split(/[\n,;\/]+/)
    .map((item) => cleanString(item))
    .filter(Boolean);
}

function extractNotesFromInputTexts(inputTexts = []) {
  const collected = [];
  for (const text of Array.isArray(inputTexts) ? inputTexts : []) {
    const raw = cleanString(text);
    if (!raw) continue;
    const normalized = normalizeText(raw);
    const looksLikeNotes = /(nota|notalar|note|pyramid|ust|kalp|alt|base|middle|top)/i.test(normalized);
    if (!looksLikeNotes) continue;
    const segments = splitNoteCandidates(raw);
    if (!segments.length) continue;
    collected.push(...segments);
  }
  return dedupeStrings(collected, 40);
}

function canonicalizeNote(rawNote) {
  const note = cleanString(rawNote);
  const normalized = normalizeText(note);
  if (!normalized) return null;

  const exactCanonical = NOTE_LOOKUP.get(normalized);
  if (exactCanonical) {
    const entry = ONTOLOGY_BY_CANONICAL.get(exactCanonical);
    return {
      input: note,
      canonical: entry.canonical,
      display: entry.display,
      family: entry.family,
      cluster: entry.cluster,
      layerHint: entry.layerHint,
      confidence: 0.96,
      matchedBy: 'exact',
    };
  }

  for (const entry of NOTE_ONTOLOGY) {
    const aliases = [entry.canonical, entry.display, ...(entry.synonyms || [])];
    for (const alias of aliases) {
      const aliasNorm = normalizeText(alias);
      if (!aliasNorm) continue;
      if (normalized.includes(aliasNorm) || aliasNorm.includes(normalized)) {
        return {
          input: note,
          canonical: entry.canonical,
          display: entry.display,
          family: entry.family,
          cluster: entry.cluster,
          layerHint: entry.layerHint,
          confidence: aliasNorm.length <= 4 ? 0.74 : 0.84,
          matchedBy: 'partial',
        };
      }
    }
  }

  return null;
}

function collectPyramidNotes(pyramid) {
  const layers = ['top', 'middle', 'base'];
  const notes = [];
  layers.forEach((layer) => {
    const layerNotes = Array.isArray(pyramid?.[layer]) ? pyramid[layer] : [];
    layerNotes.forEach((note) => {
      const cleaned = cleanString(note);
      if (!cleaned) return;
      notes.push(cleaned);
    });
  });
  return dedupeStrings(notes, 48);
}

function buildCanonicalSetFromPyramid(pyramid) {
  const set = new Set();
  collectPyramidNotes(pyramid).forEach((note) => {
    const mapped = canonicalizeNote(note);
    if (!mapped?.canonical) return;
    set.add(mapped.canonical);
  });
  return set;
}

function ensureUniquePush(target, value) {
  const normalized = normalizeText(value);
  if (!normalized) return;
  const exists = target.some((item) => normalizeText(item) === normalized);
  if (!exists) target.push(value);
}

function buildPyramidFromInputNotes(inputTexts = []) {
  const notes = extractNotesFromInputTexts(inputTexts);
  if (notes.length < 2) return null;

  const top = [];
  const middle = [];
  const base = [];

  notes.forEach((note) => {
    const mapped = canonicalizeNote(note);
    const label = mapped?.display || note;
    const layer = mapped?.layerHint || 'middle';
    if (layer === 'top') ensureUniquePush(top, label);
    else if (layer === 'base') ensureUniquePush(base, label);
    else ensureUniquePush(middle, label);
  });

  if (!top.length && middle.length > 2) {
    ensureUniquePush(top, middle.shift());
  }
  if (!base.length && middle.length > 2) {
    ensureUniquePush(base, middle.pop());
  }

  const total = top.length + middle.length + base.length;
  if (total < 2) return null;

  return {
    top: top.slice(0, 6),
    middle: middle.slice(0, 6),
    base: base.slice(0, 6),
  };
}

function buildNoteOntologyV1({ pyramid = null, inputTexts = [], noteSource = 'model' } = {}) {
  const pyramidNotes = collectPyramidNotes(pyramid);
  const inputNotes = extractNotesFromInputTexts(inputTexts);
  const notes = dedupeStrings([...pyramidNotes, ...inputNotes], 60);

  const mapped = [];
  const unmapped = [];
  const familyCount = new Map();
  let confidenceTotal = 0;

  notes.forEach((note) => {
    const match = canonicalizeNote(note);
    if (!match) {
      unmapped.push(note);
      return;
    }
    mapped.push(match);
    confidenceTotal += Number(match.confidence || 0);
    familyCount.set(match.family, (familyCount.get(match.family) || 0) + 1);
  });

  const sourceConfidenceBase = noteSource === 'official'
    ? 0.92
    : noteSource === 'inferred-input'
      ? 0.74
      : noteSource === 'model'
        ? 0.68
        : 0.52;
  const mappedCoverage = notes.length ? mapped.length / notes.length : 0;
  const avgMappedConfidence = mapped.length ? confidenceTotal / mapped.length : 0;
  const sourceConfidence = Math.max(
    0.45,
    Math.min(0.97, (sourceConfidenceBase * 0.7) + (mappedCoverage * 0.2) + (avgMappedConfidence * 0.1)),
  );

  return {
    version: 'v1',
    noteSource,
    totals: {
      notes: notes.length,
      mapped: mapped.length,
      unmapped: unmapped.length,
      coverage: Math.round(mappedCoverage * 100),
    },
    sourceConfidence: Number(sourceConfidence.toFixed(2)),
    families: Array.from(familyCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([family, count]) => ({ family, count })),
    mapped: mapped.slice(0, 24),
    unmapped: unmapped.slice(0, 16),
  };
}

module.exports = {
  NOTE_ONTOLOGY,
  buildCanonicalSetFromPyramid,
  buildNoteOntologyV1,
  buildPyramidFromInputNotes,
  canonicalizeNote,
  extractNotesFromInputTexts,
  normalizeText,
};
