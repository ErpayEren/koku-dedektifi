/* eslint-disable @typescript-eslint/no-require-imports */
const { cleanString } = require('../../lib/server/config') as {
  cleanString: (val: unknown) => string;
};
const noteMoleculeMap: Record<string, unknown> = require('../../lib/nota_molecules.json') as Record<string, unknown>;

export type EvidenceLevel =
  | 'verified_component'
  | 'signature_molecule'
  | 'accord_component'
  | 'note_match'
  | 'inferred'
  | 'unverified';

export interface Molecule {
  name: string;
  smiles?: string;
  formula?: string;
  family?: string;
  origin?: string;
  note?: string;
  contribution?: string;
  effect?: string;
  percentage?: string;
  evidenceLevel?: EvidenceLevel | string;
  evidenceLabel?: string;
  evidenceReason?: string;
  matchedNotes?: string[];
}

export interface SimilarFragrance {
  name: string;
  brand?: string;
  reason?: string;
  priceRange?: string;
  score?: number;
}

export interface ScoreCards {
  value: number;
  uniqueness: number;
  wearability: number;
}

export interface AnalysisPyramid {
  top: string[];
  middle: string[];
  base: string[];
}

export interface AnalysisResult {
  name: string;
  brand?: string | null;
  year?: number | null;
  family?: string;
  concentration?: string | null;
  pyramid?: AnalysisPyramid;
  molecules?: Molecule[];
  similarFragrances?: SimilarFragrance[];
  similar?: string[];
  dupes?: string[];
  scoreCards?: ScoreCards;
  confidenceScore?: number;
  sillage?: string;
  longevityHours?: { min: number; max: number } | null;
  seasons?: string[];
  occasions?: string[];
  genderProfile?: string;
  season?: string[];
  occasion?: string;
  technical?: Array<{ label: string; value: string; score: number }>;
  dataConfidence?: { hasDbMatch: boolean; source: string };
  [key: string]: unknown;
}

export interface PerfumeContext {
  name?: string;
  brand?: string;
  year?: number | null;
  family?: string;
  rating?: number | null;
  priceTier?: string | null;
  concentration?: string | null;
  genderProfile?: string | null;
  gender?: string | null;
  seasons?: string[];
  occasions?: string[];
  longevityScore?: number | null;
  sillageScore?: number | null;
  sillage?: string;
  longevity?: string;
  ageProfile?: string;
  top?: string[];
  heart?: string[];
  base?: string[];
  accords?: string[];
  similar?: SimilarFragrance[];
  evidenceMolecules?: Array<{
    name: string;
    evidenceLevel?: string;
    evidenceReason?: string;
    matchedNotes?: string[];
  }>;
}

// ---------------------------------------------------------------------------
// String utilities
// ---------------------------------------------------------------------------
export function normalizeToken(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNoteKey(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeFragranceKey(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => cleanString(item)).filter(Boolean);
  }
  const text = cleanString(value);
  if (!text) return [];
  return text
    .split(/[,;|/]/)
    .map((item) => cleanString(item))
    .filter(Boolean);
}

export function uniqueValues(values: unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  values.forEach((item) => {
    const cleaned = cleanString(item);
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(cleaned);
  });
  return out;
}

// ---------------------------------------------------------------------------
// Confidence score (documented in docs/confidence_formula.md)
// ---------------------------------------------------------------------------
const EVIDENCE_WEIGHTS: Record<string, number> = {
  verified_component: 5,
  signature_molecule: 5,
  accord_component: 3,
  note_match: 2,
  inferred: 1,
  unverified: 0,
};

export interface ConfidenceScoreParams {
  contextMatchScore: number;
  analysis: AnalysisResult;
  mode: string;
  hasDbMatch: boolean;
}

export function computeConfidenceScore(params: ConfidenceScoreParams): number {
  const { contextMatchScore, analysis, mode, hasDbMatch: _hasDbMatch } = params;

  const identityBonus = Math.round((contextMatchScore ?? 0) * 40);

  const topCount = Array.isArray(analysis?.pyramid?.top) ? analysis.pyramid.top.length : 0;
  const midCount = Array.isArray(analysis?.pyramid?.middle) ? analysis.pyramid.middle.length : 0;
  const baseCount = Array.isArray(analysis?.pyramid?.base) ? analysis.pyramid.base.length : 0;
  const pyramidBonus = Math.min(20, Math.round(((topCount + midCount + baseCount) / 22) * 20));

  const molecules = Array.isArray(analysis?.molecules) ? analysis.molecules : [];
  const moleculeWeightSum = molecules.reduce((acc, m) => {
    const level = cleanString(m?.evidenceLevel);
    return acc + (EVIDENCE_WEIGHTS[level] ?? 0);
  }, 0);
  const maxMoleculeWeight = 5 * 5;
  const moleculeBonus = Math.min(25, Math.round((moleculeWeightSum / maxMoleculeWeight) * 25));

  const modeBonus = mode === 'text' ? 15 : mode === 'image' ? 10 : 5;

  return Math.min(100, Math.max(0, identityBonus + pyramidBonus + moleculeBonus + modeBonus));
}

// ---------------------------------------------------------------------------
// Context match score
// ---------------------------------------------------------------------------
export function computeContextMatchScore(
  inputText: string | undefined,
  perfumeContext: PerfumeContext | null | undefined,
): number {
  const query = normalizeToken(inputText);
  if (!query || !perfumeContext) return 0;
  const contextName = normalizeToken(perfumeContext.name);
  const contextBrand = normalizeToken(perfumeContext.brand);
  const full = normalizeToken(`${contextBrand} ${contextName}`);

  if (full && (full === query || query === full)) return 1;
  if (
    contextName &&
    (contextName === query || query.includes(contextName) || contextName.includes(query))
  )
    return 0.88;

  const queryTokens = query.split(' ').filter(Boolean);
  const targetTokens = uniqueValues(`${contextBrand} ${contextName}`.split(' '));
  const overlap = queryTokens.filter((token) => targetTokens.includes(token)).length;
  return queryTokens.length > 0 ? overlap / queryTokens.length : 0;
}

// ---------------------------------------------------------------------------
// Score cards (derived from signals when LLM output looks generic)
// ---------------------------------------------------------------------------
const PRICE_TIER_VALUE_BASE: Record<string, number> = {
  budget: 9,
  mid: 8,
  premium: 7,
  luxury: 6,
  ultraluxury: 5,
};

const FAMILY_WEARABILITY_BASE: Record<string, number> = {
  aromatik: 8,
  fresh: 8,
  aquatik: 8,
  ciceksi: 7,
  gourmand: 6,
  odunsu: 6,
  oryantal: 5,
  oud: 4,
};

function clampTenScore(value: number, fallback = 7): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(1, Math.min(10, Math.round(num)));
}

function scoreFromRating(rawRating: unknown): number {
  const numeric = Number(rawRating);
  if (!Number.isFinite(numeric)) return 0;
  const normalized = numeric > 10 ? 10 : numeric <= 5 ? numeric * 2 : numeric;
  return Math.max(-2, Math.min(3, Math.round((normalized - 6.2) / 1.3)));
}

function countDistinctiveNotes(notes: unknown[]): number {
  const text = notes.map((item) => normalizeToken(item)).join(' ');
  const patterns = [
    'oud', 'saffron', 'safran', 'incense', 'labdanum', 'oakmoss',
    'iris', 'myrrh', 'leather', 'tobacco', 'benzoin', 'patchouli', 'vetiver',
  ];
  return patterns.reduce((acc, token) => (text.includes(token) ? acc + 1 : acc), 0);
}

export interface ScoreCardSignals {
  family: string;
  priceTier: string;
  rating?: unknown;
  notes: unknown[];
  contextMatched: boolean;
}

export function deriveScoreCardsFromSignals(signals: ScoreCardSignals): ScoreCards {
  const { family, priceTier, rating, notes, contextMatched } = signals;
  const normalizedFamily = normalizeToken(family).replace(/\s+/g, '');
  const normalizedTier = normalizeToken(priceTier).replace(/\s+/g, '');
  const ratingDelta = scoreFromRating(rating);
  const noteCount = uniqueValues(Array.isArray(notes) ? notes : []).length;
  const distinctives = countDistinctiveNotes(notes);

  const valueBase = PRICE_TIER_VALUE_BASE[normalizedTier] ?? 7;
  const wearBase = FAMILY_WEARABILITY_BASE[normalizedFamily] ?? 7;
  const uniquenessBase =
    normalizedFamily === 'oud'
      ? 9
      : normalizedFamily === 'oryantal'
        ? 8
        : normalizedFamily === 'gourmand'
          ? 7
          : 6;

  const value = clampTenScore(
    valueBase +
      ratingDelta +
      (contextMatched ? 1 : 0) +
      (noteCount >= 6 ? 1 : 0) -
      (normalizedTier === 'ultraluxury' ? 1 : 0),
    7,
  );
  const uniqueness = clampTenScore(
    uniquenessBase +
      Math.min(2, distinctives) +
      (noteCount >= 8 ? 1 : 0) +
      (contextMatched ? 1 : 0),
    7,
  );
  const wearability = clampTenScore(
    wearBase +
      (normalizedFamily === 'oud' || normalizedFamily === 'oryantal' ? -1 : 0) +
      (noteCount >= 7 ? -1 : 0) +
      ratingDelta,
    7,
  );

  return { value, uniqueness, wearability };
}

function patchTechnicalScores(analysis: AnalysisResult): void {
  if (!analysis?.scoreCards || !Array.isArray(analysis.technical)) return;
  const { scoreCards } = analysis;
  analysis.technical = analysis.technical.map((item) => {
    const label = normalizeToken(item?.label);
    if (label === 'deger')
      return { ...item, value: `${scoreCards.value}/10`, score: scoreCards.value * 10 };
    if (label === 'ozgunluk')
      return {
        ...item,
        value: `${scoreCards.uniqueness}/10`,
        score: scoreCards.uniqueness * 10,
      };
    if (label === 'giyilebilirlik')
      return {
        ...item,
        value: `${scoreCards.wearability}/10`,
        score: scoreCards.wearability * 10,
      };
    return item;
  });
}

function scoreCardsLookGeneric(analysis: AnalysisResult): boolean {
  const value = Number(analysis?.scoreCards?.value);
  const uniqueness = Number(analysis?.scoreCards?.uniqueness);
  const wearability = Number(analysis?.scoreCards?.wearability);
  if (!Number.isFinite(value) || !Number.isFinite(uniqueness) || !Number.isFinite(wearability))
    return true;
  return value === 7 && uniqueness === 7 && wearability === 7;
}

// ---------------------------------------------------------------------------
// Family derivation
// ---------------------------------------------------------------------------
export function deriveFamilyFromNotes(noteList: unknown[], fallback = 'Aromatik'): string {
  const text = (Array.isArray(noteList) ? noteList : [])
    .map((item) => normalizeToken(item))
    .join(' ');
  if (!text) return fallback;
  if (/(oud|agarwood)/.test(text)) return 'Oud';
  if (/(amber|incense|safran|saffron|labdanum|myrrh|benzoin|oriental)/.test(text)) return 'Oryantal';
  if (/(patchouli|vetiver|cedar|sedir|sandal|wood|woody|oakmoss|guaiac)/.test(text)) return 'Odunsu';
  if (/(lavender|bergamot|lemon|limon|mint|marine|aquatic|fresh|aromatic|fougere)/.test(text))
    return 'Aromatik';
  if (/(rose|gul|jasmine|yasemin|iris|ylang|floral|violet|peony)/.test(text)) return 'Ciceksi';
  if (/(vanilla|tonka|praline|caramel|coumarin|gourmand|honey)/.test(text)) return 'Gourmand';
  return fallback;
}

// ---------------------------------------------------------------------------
// Sillage / longevity helpers
// ---------------------------------------------------------------------------
function toSillageLabelFromScore(score: unknown): string {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return '';
  if (numeric >= 9) return 'cok guclu';
  if (numeric >= 7) return 'guclu';
  if (numeric >= 4) return 'orta';
  return 'yakin';
}

function toLongevityHoursFromScore(
  score: unknown,
): { min: number; max: number } | null {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return null;
  const min = Math.max(2, Math.round(numeric * 0.8));
  const max = Math.max(min + 1, Math.round(numeric * 1.35));
  return { min, max };
}

// ---------------------------------------------------------------------------
// Note → molecule map lookup
// ---------------------------------------------------------------------------
function resolveNoteMapEntry(note: string): Record<string, unknown> | null {
  const key = normalizeNoteKey(note);
  if (!key) return null;
  return (noteMoleculeMap[key] as Record<string, unknown>) ?? null;
}

function resolveMappedMoleculeRows(
  entry: Record<string, unknown> | null,
): Array<{ name: string; role: string; odorDescriptor: string }> {
  if (!entry || typeof entry !== 'object') return [];

  const keyMolecules = entry['key_molecules'];
  if (Array.isArray(keyMolecules) && keyMolecules.length > 0) {
    return keyMolecules
      .map((item: unknown) => {
        const i = item as Record<string, unknown>;
        return {
          name: cleanString(i?.name),
          role: cleanString(i?.role) || 'temel taşıyıcı',
          odorDescriptor: cleanString(i?.odor_descriptor),
        };
      })
      .filter((item) => item.name);
  }

  const molecules = entry['molecules'];
  if (Array.isArray(molecules) && molecules.length > 0) {
    return molecules
      .map((name: unknown) => ({
        name: cleanString(name),
        role: 'temel taşıyıcı',
        odorDescriptor: '',
      }))
      .filter((item) => item.name);
  }

  return [];
}

// ---------------------------------------------------------------------------
// Molecule building
// ---------------------------------------------------------------------------
export function buildFallbackMolecules(
  perfumeContext: PerfumeContext | null | undefined,
  isPro: boolean,
): Molecule[] {
  if (!perfumeContext) return [];

  const orderedNotes = [
    ...(perfumeContext.top ?? []),
    ...(perfumeContext.heart ?? []),
    ...(perfumeContext.base ?? []),
  ]
    .map((item) => cleanString(item))
    .filter(Boolean);

  const maxCount = isPro ? 8 : 4;
  const pool: Molecule[] = [];
  const seen = new Set<string>();

  const evidenceRows = Array.isArray(perfumeContext.evidenceMolecules)
    ? perfumeContext.evidenceMolecules
    : [];

  evidenceRows.forEach((entry) => {
    if (pool.length >= maxCount) return;
    const name = cleanString(entry?.name);
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    const matchedNotes = Array.isArray(entry?.matchedNotes)
      ? entry.matchedNotes.map((n) => cleanString(n)).filter(Boolean)
      : [];
    const firstNote = matchedNotes[0] ?? orderedNotes[0] ?? 'Koku omurgasi';

    pool.push({
      name,
      smiles: '',
      formula: '',
      family: '',
      origin: '',
      note: firstNote,
      contribution:
        cleanString(entry?.evidenceReason) ||
        `${name} bu parfum omurgasinda savunulabilir bir iz verir.`,
      effect: `${name} koku iskeletini destekler.`,
      percentage: !isPro && pool.length > 0 ? 'Pro ile goruntule' : 'Kanitli bag',
      evidenceLevel: cleanString(entry?.evidenceLevel) || 'note_match',
      evidenceLabel: 'Nota Eslesmesi',
      evidenceReason: cleanString(entry?.evidenceReason) || 'Kanit tablosundan eslesti.',
      matchedNotes,
    });
  });

  if (orderedNotes.length === 0 && pool.length > 0) return pool;

  for (const note of orderedNotes) {
    const hit = resolveNoteMapEntry(note);
    const mappedMolecules = resolveMappedMoleculeRows(hit);
    if (!hit || mappedMolecules.length === 0) continue;

    for (const molecule of mappedMolecules) {
      const cleaned = cleanString(molecule.name);
      if (!cleaned) continue;
      const key = cleaned.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const accordFamily = cleanString((hit['family'] as unknown) ?? (hit['accord_family'] as unknown)) || '';
      const noteCharacter = cleanString(hit['character'] as unknown);
      const descriptor = cleanString(molecule.odorDescriptor);
      const roleHint = cleanString(molecule.role) || 'temel taşıyıcı';

      pool.push({
        name: cleaned,
        smiles: '',
        formula: '',
        family: accordFamily,
        origin: '',
        note,
        contribution:
          noteCharacter ||
          `${note} notasinin karakterini tasiyan savunulabilir bir molekuler bilesen.`,
        effect:
          descriptor || `${accordFamily || 'Akor'} yapisini destekleyen ${roleHint.toLowerCase()} bir etki.`,
        percentage: !isPro && pool.length > 0 ? 'Pro ile goruntule' : 'Akor tasiyici',
        evidenceLevel: 'note_match',
        evidenceLabel: 'Nota Eslesmesi',
        evidenceReason: `"${note}" notasiyla eslesen molekul bagi.`,
        matchedNotes: [note],
      });
      if (pool.length >= maxCount) break;
    }
    if (pool.length >= maxCount) break;
  }

  return pool;
}

// ---------------------------------------------------------------------------
// Similar fragrances helpers
// ---------------------------------------------------------------------------
function isSameFragrance(
  analysis: { name?: string | null; brand?: string | null },
  name: string,
  brand: string,
): boolean {
  const candidateName = cleanString(name);
  if (!candidateName) return false;
  const candidateBrand = cleanString(brand);
  const candidateKeys = [
    normalizeFragranceKey(candidateName),
    normalizeFragranceKey(`${candidateBrand} ${candidateName}`),
  ].filter(Boolean);

  const targetName = cleanString(analysis?.name);
  const targetBrand = cleanString(analysis?.brand);
  const targetKeys = [
    normalizeFragranceKey(targetName),
    normalizeFragranceKey(`${targetBrand} ${targetName}`),
  ].filter(Boolean);

  return candidateKeys.some((key) => targetKeys.includes(key));
}

const LAST_RESORT_SIMILAR_FALLBACKS: Record<
  string,
  Array<{ name: string; brand: string; priceRange: string }>
> = {
  Gourmand: [
    { name: 'Black Opium', brand: 'Yves Saint Laurent', priceRange: 'premium' },
    { name: 'Flowerbomb', brand: 'Viktor&Rolf', priceRange: 'premium' },
    { name: 'Shalimar', brand: 'Guerlain', priceRange: 'luxury' },
    { name: 'Angel', brand: 'Thierry Mugler', priceRange: 'premium' },
    { name: 'Naxos', brand: 'Xerjoff', priceRange: 'luxury' },
    { name: 'Layton', brand: 'Parfums de Marly', priceRange: 'luxury' },
    { name: 'Replica Jazz Club', brand: 'Maison Margiela', priceRange: 'premium' },
    { name: 'Black Orchid', brand: 'Tom Ford', priceRange: 'luxury' },
  ],
  Odunsu: [
    { name: 'Sauvage', brand: 'Dior', priceRange: 'premium' },
    { name: 'Aventus', brand: 'Creed', priceRange: 'luxury' },
    { name: 'Layton', brand: 'Parfums de Marly', priceRange: 'luxury' },
    { name: 'Interlude Man', brand: 'Amouage', priceRange: 'luxury' },
    { name: 'Oud for Greatness', brand: 'Initio', priceRange: 'ultra-luxury' },
    { name: 'African Leather', brand: 'Memo Paris', priceRange: 'luxury' },
    { name: 'Wood Sage & Sea Salt', brand: 'Jo Malone', priceRange: 'premium' },
    { name: 'By the Fireplace', brand: 'Maison Margiela', priceRange: 'premium' },
  ],
  Aromatik: [
    { name: 'Sauvage', brand: 'Dior', priceRange: 'premium' },
    { name: 'Acqua di Gio Profondo', brand: 'Giorgio Armani', priceRange: 'premium' },
    { name: 'Luna Rossa Carbon', brand: 'Prada', priceRange: 'premium' },
    { name: 'Aventus', brand: 'Creed', priceRange: 'luxury' },
    { name: 'Wood Sage & Sea Salt', brand: 'Jo Malone', priceRange: 'premium' },
    { name: 'Gypsy Water', brand: 'Byredo', priceRange: 'luxury' },
    { name: 'Orange Sanguine', brand: 'Atelier Cologne', priceRange: 'premium' },
    { name: 'Sauvage Elixir', brand: 'Dior', priceRange: 'premium' },
  ],
  Ciceksi: [
    { name: 'No.5', brand: 'Chanel', priceRange: 'luxury' },
    { name: 'For Her', brand: 'Narciso Rodriguez', priceRange: 'premium' },
    { name: 'Portrait of a Lady', brand: 'Frederic Malle', priceRange: 'ultra-luxury' },
    { name: 'Flowerbomb', brand: 'Viktor&Rolf', priceRange: 'premium' },
    { name: 'Shalimar', brand: 'Guerlain', priceRange: 'luxury' },
    { name: 'Black Orchid', brand: 'Tom Ford', priceRange: 'luxury' },
    { name: 'Mon Paris', brand: 'Yves Saint Laurent', priceRange: 'premium' },
    { name: 'Delina', brand: 'Parfums de Marly', priceRange: 'luxury' },
  ],
};

function buildSimilarReason(
  sharedNotes: string[],
  familyMatched: boolean,
  family: string,
): string {
  if (sharedNotes.length > 0) {
    return `"${sharedNotes.slice(0, 2).join(', ')}" notalarında yakın profil.`;
  }
  if (familyMatched && cleanString(family)) {
    return `${family} karakterine yakın bir profil.`;
  }
  return 'Koku omurgasında benzer yapı gösteriyor.';
}

function collectAnalysisNotes(analysis: AnalysisResult): string[] {
  if (!analysis || typeof analysis !== 'object') return [];
  const top = Array.isArray(analysis?.pyramid?.top) ? analysis.pyramid.top : [];
  const middle = Array.isArray(analysis?.pyramid?.middle) ? analysis.pyramid.middle : [];
  const base = Array.isArray(analysis?.pyramid?.base) ? analysis.pyramid.base : [];
  return uniqueValues([...top, ...middle, ...base]).slice(0, 16);
}

const FAMILY_TO_ACCORD_HINTS: Record<string, string[]> = {
  gourmand: ['gourmand', 'sweet', 'vanilla', 'caramel', 'dessert'],
  odunsu: ['woody', 'wood', 'amber', 'oud', 'earthy'],
  aromatik: ['aromatic', 'fougere', 'fresh spicy', 'herbal', 'green'],
  ciceksi: ['floral', 'rose', 'white floral', 'powdery', 'iris'],
  oryantal: ['oriental', 'amber', 'resinous', 'incense', 'spicy'],
  fresh: ['fresh', 'citrus', 'aquatic', 'marine', 'green'],
};

function getFamilyAccordHints(family: string): string[] {
  const normalized = normalizeToken(family).replace(/\s+/g, '');
  for (const [key, hints] of Object.entries(FAMILY_TO_ACCORD_HINTS)) {
    if (normalized.includes(key)) return hints;
  }
  return [];
}

export function enrichSimilarFragrances(
  analysis: AnalysisResult,
  perfumeContext: PerfumeContext | null | undefined,
  isPro: boolean,
): void {
  if (!analysis || !perfumeContext) return;

  const maxCount = isPro ? 10 : 6;
  const current = Array.isArray(analysis.similarFragrances)
    ? analysis.similarFragrances.filter((item) => cleanString(item?.name))
    : [];
  const seen = new Set(
    current.map(
      (item) =>
        `${cleanString(item.brand).toLowerCase()}::${cleanString(item.name).toLowerCase()}`,
    ),
  );

  const contextSimilar = Array.isArray(perfumeContext.similar) ? perfumeContext.similar : [];
  for (const item of contextSimilar) {
    const name = cleanString(item?.name);
    if (!name) continue;
    const brand = cleanString(item?.brand);
    const key = `${brand.toLowerCase()}::${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    if (isSameFragrance(analysis, name, brand)) continue;

    current.push({
      name,
      brand,
      reason: cleanString(item.reason) || 'Benzer akor omurgasi.',
      priceRange: cleanString(item.priceRange) || 'Fiyat bilgisi yok',
    });
    seen.add(key);
    if (current.length >= maxCount) break;
  }

  if (current.length === 0) return;

  analysis.similarFragrances = current.slice(0, maxCount);
  analysis.similar = analysis.similarFragrances.map((item) =>
    `${cleanString(item.brand)} ${cleanString(item.name)}`.trim(),
  );
  analysis.dupes = analysis.similar.slice(0, Math.min(3, analysis.similar.length));
}

export function applySimilarFragrances(
  analysis: AnalysisResult,
  candidates: SimilarFragrance[],
  isPro: boolean,
): void {
  if (!analysis || !Array.isArray(candidates) || candidates.length === 0) return;
  const maxCount = isPro ? 10 : 6;
  const current = Array.isArray(analysis.similarFragrances)
    ? analysis.similarFragrances.filter((item) => cleanString(item?.name))
    : [];
  const merged: SimilarFragrance[] = [];
  const seen = new Set<string>();

  [...candidates, ...current].forEach((item) => {
    const name = cleanString(item?.name);
    if (!name) return;
    const brand = cleanString(item?.brand);
    const key = `${brand.toLowerCase()}::${name.toLowerCase()}`;
    if (seen.has(key)) return;
    if (isSameFragrance(analysis, name, brand)) return;
    seen.add(key);
    merged.push({
      name,
      brand,
      reason: cleanString(item?.reason) || 'Benzer profil.',
      priceRange: cleanString(item?.priceRange) || 'Fiyat bilgisi yok',
    });
  });

  const limited = merged.slice(0, maxCount);
  if (limited.length === 0) return;
  analysis.similarFragrances = limited;
  analysis.similar = limited.map((item) => `${item.brand} ${item.name}`.trim());
  analysis.dupes = analysis.similar.slice(0, Math.min(3, analysis.similar.length));
}

export function fallbackSimilarByFamily(analysis: AnalysisResult, isPro: boolean): void {
  if (!analysis) return;
  const current = Array.isArray(analysis.similarFragrances)
    ? analysis.similarFragrances.filter((item) => cleanString(item?.name))
    : [];
  const maxCount = isPro ? 10 : 6;
  const minVisibleCount = isPro ? 8 : 6;
  if (current.length >= minVisibleCount) return;

  const familyKey = cleanString(analysis.family)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '');

  const pool =
    LAST_RESORT_SIMILAR_FALLBACKS[cleanString(analysis.family)] ??
    LAST_RESORT_SIMILAR_FALLBACKS[familyKey] ??
    LAST_RESORT_SIMILAR_FALLBACKS['Aromatik'] ??
    [];

  const seen = new Set(
    current.map(
      (item) =>
        `${cleanString(item.brand).toLowerCase()}::${cleanString(item.name).toLowerCase()}`,
    ),
  );
  const picked = current.slice();
  for (const item of pool) {
    const name = cleanString(item.name);
    if (!name) continue;
    const brand = cleanString(item.brand);
    if (isSameFragrance(analysis, name, brand)) continue;
    const key = `${brand.toLowerCase()}::${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    picked.push({
      name: item.name,
      brand: item.brand,
      reason: `${analysis.family ?? 'Benzer'} aile karakterinde yakin bir profil.`,
      priceRange: item.priceRange ?? 'Fiyat bilgisi yok',
    });
    seen.add(key);
    if (picked.length >= maxCount) break;
  }

  if (picked.length === 0) return;
  const normalized = picked.slice(0, maxCount);
  analysis.similarFragrances = normalized;
  analysis.similar = normalized.map((item) => `${item.brand} ${item.name}`.trim());
  analysis.dupes = analysis.similar.slice(0, Math.min(3, analysis.similar.length));
}

// ---------------------------------------------------------------------------
// DB similar fragrances
// ---------------------------------------------------------------------------
export async function getDBSimilarFragrances(
  analysis: AnalysisResult,
  isPro: boolean,
): Promise<SimilarFragrance[]> {
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js') as {
    createClient: typeof import('@supabase/supabase-js').createClient;
  };
  const { resolveSupabaseConfig: getConfig } = require('../../lib/server/supabase-config') as {
    resolveSupabaseConfig: () => { url: string; serviceRoleKey: string };
  };

  const config = getConfig();
  if (!config.url || !config.serviceRoleKey) return [];

  const table =
    cleanString(process.env['SUPABASE_FRAGRANCES_TABLE']) ||
    cleanString(process.env['SUPABASE_PERFUMES_TABLE']) ||
    'fragrances';

  const notes = collectAnalysisNotes(analysis);
  const familyHints = getFamilyAccordHints(analysis?.family ?? '');
  const topAnchor = cleanString(
    Array.isArray(analysis?.pyramid?.top) ? (analysis.pyramid.top[0] ?? '') : '',
  );
  const middleAnchor = cleanString(
    Array.isArray(analysis?.pyramid?.middle) ? (analysis.pyramid.middle[0] ?? '') : '',
  );
  const baseAnchor = cleanString(
    Array.isArray(analysis?.pyramid?.base) ? (analysis.pyramid.base[0] ?? '') : '',
  );

  const client = createSupabaseClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false },
  });
  const selectCols = 'name,brand,price_tier,top_notes,heart_notes,base_notes,character_tags';
  const queries: any[] = [];

  if (familyHints.length > 0) {
    queries.push(
      client.from(table).select(selectCols).overlaps('character_tags', familyHints).limit(200),
    );
  }
  if (topAnchor) {
    queries.push(
      client.from(table).select(selectCols).contains('top_notes', [topAnchor]).limit(140),
    );
  }
  if (middleAnchor) {
    queries.push(
      client.from(table).select(selectCols).contains('heart_notes', [middleAnchor]).limit(140),
    );
  }
  if (baseAnchor) {
    queries.push(
      client.from(table).select(selectCols).contains('base_notes', [baseAnchor]).limit(140),
    );
  }
  if (queries.length === 0 && notes[0]) {
    queries.push(
      client.from(table).select(selectCols).contains('top_notes', [notes[0]]).limit(120),
    );
  }
  if (queries.length === 0) return [];

  const responses = await Promise.race([
    Promise.all(queries),
    new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('db_similarity_timeout')), 2000),
    ),
  ]).catch(() => null);

  if (!responses) return [];

  const noteKeySet = new Set(notes.map((item) => normalizeToken(item)).filter(Boolean));
  const familyKeySet = new Set(familyHints.map((item) => normalizeToken(item)).filter(Boolean));
  const candidateMap = new Map<string, SimilarFragrance & { score: number }>();
  const maxCount = isPro ? 10 : 6;

  (responses as Array<{ error: unknown; data: unknown[] } | null>).forEach((response) => {
    if (!response || response.error || !Array.isArray(response.data)) return;
    response.data.forEach((row: unknown) => {
      const r = row as Record<string, unknown>;
      const name = cleanString(r?.name);
      const brand = cleanString(r?.brand);
      if (!name) return;
      if (isSameFragrance(analysis, name, brand)) return;

      const rowNotes = uniqueValues([
        ...toStringArray(r?.top_notes),
        ...toStringArray(r?.heart_notes),
        ...toStringArray(r?.base_notes),
      ]);
      const rowAccords = uniqueValues(toStringArray(r?.character_tags));
      const sharedNotes = rowNotes.filter((item) => noteKeySet.has(normalizeToken(item)));
      const familyMatched = rowAccords.some((item) => familyKeySet.has(normalizeToken(item)));

      const score = sharedNotes.length * 14 + (familyMatched ? 26 : 0) + Math.min(rowNotes.length, 6);
      if (score <= 0) return;

      const key = `${brand.toLowerCase()}::${name.toLowerCase()}`;
      const existing = candidateMap.get(key);
      const candidate = {
        name,
        brand,
        reason: buildSimilarReason(sharedNotes, familyMatched, analysis?.family ?? ''),
        priceRange: cleanString(r?.price_tier) || 'Fiyat bilgisi yok',
        score,
      };
      if (!existing || candidate.score > existing.score) {
        candidateMap.set(key, candidate);
      }
    });
  });

  return Array.from(candidateMap.values())
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, maxCount);
}

// ---------------------------------------------------------------------------
// Safety fallbacks: context anchors + pyramid + score cards
// ---------------------------------------------------------------------------
const FAMILY_NOTE_FALLBACKS: Record<string, { top: string[]; middle: string[]; base: string[] }> =
  {
    Gourmand: {
      top: ['Bergamot', 'Kirmizi meyveler'],
      middle: ['Pralin', 'Bal'],
      base: ['Vanilya', 'Patchouli', 'Tonka'],
    },
    Odunsu: {
      top: ['Bergamot', 'Karabiber'],
      middle: ['Lavanta', 'Sedir'],
      base: ['Vetiver', 'Patchouli', 'Amber'],
    },
    Aromatik: {
      top: ['Bergamot', 'Limon'],
      middle: ['Lavanta', 'Ada cayi'],
      base: ['Amber', 'Misk'],
    },
    Ciceksi: {
      top: ['Neroli', 'Bergamot'],
      middle: ['Yasemin', 'Gul'],
      base: ['Misk', 'Sandal'],
    },
  };

function applyPerfumeContextAnchors(
  analysis: AnalysisResult,
  perfumeContext: PerfumeContext | null | undefined,
  options: { enforceIdentity?: boolean } = {},
): void {
  if (!analysis || !perfumeContext) return;
  const enforceIdentity = Boolean(options.enforceIdentity);
  const contextFamily =
    cleanString(perfumeContext.family) ||
    deriveFamilyFromNotes(perfumeContext.accords ?? [], analysis.family ?? 'Aromatik');

  if (enforceIdentity) {
    analysis.name = cleanString(perfumeContext.name) || analysis.name;
    analysis.brand = cleanString(perfumeContext.brand) || analysis.brand;
    analysis.year = Number.isFinite(Number(perfumeContext.year))
      ? Number(perfumeContext.year)
      : analysis.year;
  }

  if (!cleanString(analysis.family) || cleanString(analysis.family).toLowerCase() === 'aromatik') {
    analysis.family = contextFamily || analysis.family;
  }

  if (!cleanString(analysis.concentration)) {
    analysis.concentration =
      cleanString(perfumeContext.concentration) || analysis.concentration || null;
  }
  if (!cleanString(analysis.genderProfile)) {
    analysis.genderProfile =
      cleanString(perfumeContext.genderProfile) || analysis.genderProfile || 'Unisex';
  }
  if (
    (!Array.isArray(analysis.season) || analysis.season.length === 0) &&
    Array.isArray(perfumeContext.seasons)
  ) {
    analysis.season = uniqueValues(perfumeContext.seasons).slice(0, 4);
  }
  if (
    (!Array.isArray(analysis.occasions) || analysis.occasions.length === 0) &&
    Array.isArray(perfumeContext.occasions)
  ) {
    analysis.occasions = uniqueValues(perfumeContext.occasions).slice(0, 6);
    analysis.occasion = analysis.occasions[0] ?? analysis.occasion;
  }

  if (!analysis.pyramid || enforceIdentity) {
    analysis.pyramid = {
      top: uniqueValues(perfumeContext.top ?? []).slice(0, 6),
      middle: uniqueValues(perfumeContext.heart ?? []).slice(0, 8),
      base: uniqueValues(perfumeContext.base ?? []).slice(0, 8),
    };
  }

  if (!cleanString(analysis.sillage)) {
    analysis.sillage =
      toSillageLabelFromScore(perfumeContext.sillageScore) || analysis.sillage || 'orta';
  }
  if (!analysis.longevityHours) {
    analysis.longevityHours =
      toLongevityHoursFromScore(perfumeContext.longevityScore) || analysis.longevityHours;
  }
}

function ensurePyramidNotes(
  analysis: AnalysisResult,
  perfumeContext: PerfumeContext | null | undefined,
): void {
  if (!analysis || !perfumeContext) return;
  if (!analysis.pyramid || typeof analysis.pyramid !== 'object') {
    analysis.pyramid = { top: [], middle: [], base: [] };
  }

  if (
    (!Array.isArray(analysis.pyramid.top) || analysis.pyramid.top.length === 0) &&
    Array.isArray(perfumeContext.top)
  ) {
    analysis.pyramid.top = perfumeContext.top.slice(0, 6);
  }
  if (
    (!Array.isArray(analysis.pyramid.middle) || analysis.pyramid.middle.length === 0) &&
    Array.isArray(perfumeContext.heart)
  ) {
    analysis.pyramid.middle = perfumeContext.heart.slice(0, 8);
  }
  if (
    (!Array.isArray(analysis.pyramid.base) || analysis.pyramid.base.length === 0) &&
    Array.isArray(perfumeContext.base)
  ) {
    analysis.pyramid.base = perfumeContext.base.slice(0, 8);
  }
}

function fillPyramidFromFamilyFallback(analysis: AnalysisResult): void {
  if (!analysis) return;
  if (!analysis.pyramid || typeof analysis.pyramid !== 'object') {
    analysis.pyramid = { top: [], middle: [], base: [] };
  }

  const familyKey = cleanString(analysis.family)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '');
  const fallback =
    FAMILY_NOTE_FALLBACKS[cleanString(analysis.family)] ??
    FAMILY_NOTE_FALLBACKS[familyKey] ??
    FAMILY_NOTE_FALLBACKS['Aromatik'];
  if (!fallback) return;

  if (!Array.isArray(analysis.pyramid.top) || analysis.pyramid.top.length === 0) {
    analysis.pyramid.top = fallback.top.slice(0, 6);
  }
  if (!Array.isArray(analysis.pyramid.middle) || analysis.pyramid.middle.length === 0) {
    analysis.pyramid.middle = fallback.middle.slice(0, 8);
  }
  if (!Array.isArray(analysis.pyramid.base) || analysis.pyramid.base.length === 0) {
    analysis.pyramid.base = fallback.base.slice(0, 8);
  }
}

export interface SafetyFallbackOptions {
  inputText?: string;
  mode?: string;
  providerHealthy?: boolean;
  contextMatchScore?: number;
}

export function applySafetyFallbacks(
  analysis: AnalysisResult,
  perfumeContext: PerfumeContext | null | undefined,
  isPro: boolean,
  options: SafetyFallbackOptions = {},
): AnalysisResult {
  if (!analysis) return analysis;

  const contextMatchScore = Number.isFinite(Number(options.contextMatchScore))
    ? Number(options.contextMatchScore)
    : computeContextMatchScore(options.inputText, perfumeContext);
  const enforceIdentity = options.mode === 'text' && contextMatchScore >= 0.72;
  applyPerfumeContextAnchors(analysis, perfumeContext, { enforceIdentity });

  ensurePyramidNotes(analysis, perfumeContext);
  fillPyramidFromFamilyFallback(analysis);

  const molecules = Array.isArray(analysis.molecules)
    ? analysis.molecules.filter((item) => cleanString(item?.name))
    : [];
  if (molecules.length === 0) {
    analysis.molecules = buildFallbackMolecules(perfumeContext, isPro);
  }

  const postContextMolecules = Array.isArray(analysis.molecules)
    ? analysis.molecules.filter((item) => cleanString(item?.name))
    : [];
  if (postContextMolecules.length === 0) {
    analysis.molecules = buildFallbackMolecules(
      {
        top: Array.isArray(analysis?.pyramid?.top) ? analysis.pyramid.top : [],
        heart: Array.isArray(analysis?.pyramid?.middle) ? analysis.pyramid.middle : [],
        base: Array.isArray(analysis?.pyramid?.base) ? analysis.pyramid.base : [],
        evidenceMolecules: [],
      },
      isPro,
    );
  }

  enrichSimilarFragrances(analysis, perfumeContext, isPro);
  fallbackSimilarByFamily(analysis, isPro);

  const notesForScoring = [
    ...(Array.isArray(analysis?.pyramid?.top) ? analysis.pyramid.top : []),
    ...(Array.isArray(analysis?.pyramid?.middle) ? analysis.pyramid.middle : []),
    ...(Array.isArray(analysis?.pyramid?.base) ? analysis.pyramid.base : []),
  ];
  if (scoreCardsLookGeneric(analysis)) {
    analysis.scoreCards = deriveScoreCardsFromSignals({
      family: analysis.family ?? '',
      priceTier: perfumeContext?.priceTier ?? '',
      rating: perfumeContext?.rating,
      notes: notesForScoring,
      contextMatched: contextMatchScore >= 0.55,
    });
    patchTechnicalScores(analysis);
  }

  return analysis;
}

// ---------------------------------------------------------------------------
// Emergency payload (fallback when LLM fails)
// ---------------------------------------------------------------------------
function parseInputNotes(input: string): string[] {
  const text = cleanString(input);
  if (!text) return [];

  const hasExplicitSeparator = /[,;|/\n]/.test(text);
  if (hasExplicitSeparator) {
    const explicitNotes = text
      .split(/[,;|/\n]/)
      .map((item) => cleanString(item))
      .filter(Boolean);
    if (explicitNotes.length > 0) return uniqueValues(explicitNotes).slice(0, 8);
  }

  const normalized = normalizeToken(text);
  if (!normalized) return [];

  const discovered: string[] = [];
  const seen = new Set<string>();
  Object.keys(noteMoleculeMap).forEach((noteKey) => {
    const normalizedKey = normalizeToken(noteKey);
    if (!normalizedKey) return;
    if (!normalized.includes(normalizedKey)) return;
    if (seen.has(normalizedKey)) return;
    seen.add(normalizedKey);
    discovered.push(noteKey);
  });

  return discovered.slice(0, 8);
}

export interface EmergencyPayloadParams {
  input: string;
  mode: string;
  isPro: boolean;
  perfumeContext?: PerfumeContext | null;
  providerError?: string;
}

export function buildEmergencyPayloadV2(params: EmergencyPayloadParams): Record<string, unknown> {
  const { input, mode, isPro, perfumeContext, providerError } = params;
  const parsedInputNotes = parseInputNotes(input);
  const guessedFamily = deriveFamilyFromNotes(parsedInputNotes, 'Aromatik');
  const name = cleanString(perfumeContext?.name) || cleanString(input) || 'Bilinmeyen Koku';
  const brand = cleanString(perfumeContext?.brand) || null;
  const family = cleanString(perfumeContext?.family) || guessedFamily || 'Aromatik';

  const top =
    Array.isArray(perfumeContext?.top) && perfumeContext.top.length > 0
      ? perfumeContext.top.slice(0, 6)
      : parsedInputNotes.slice(0, 3);
  const heart =
    Array.isArray(perfumeContext?.heart) && perfumeContext.heart.length > 0
      ? perfumeContext.heart.slice(0, 8)
      : parsedInputNotes.slice(3, 6);
  const base =
    Array.isArray(perfumeContext?.base) && perfumeContext.base.length > 0
      ? perfumeContext.base.slice(0, 8)
      : parsedInputNotes.slice(6, 9);

  const fallbackContext: PerfumeContext = perfumeContext ?? { top, heart, base, evidenceMolecules: [] };
  const fallbackMolecules = buildFallbackMolecules(fallbackContext, isPro).slice(
    0,
    isPro ? 6 : 2,
  );

  const fallbackSimilar = (Array.isArray(perfumeContext?.similar) ? perfumeContext.similar : [])
    .slice(0, isPro ? 10 : 6)
    .map((item) => ({
      name: cleanString(item?.name),
      brand: cleanString(item?.brand),
      reason: cleanString(item?.reason) || 'Benzer profil omurgasi.',
      priceRange: cleanString(item?.priceRange) || 'Fiyat bilgisi yok',
    }))
    .filter((item) => Boolean(item.name) && !isSameFragrance({ name, brand }, item.name, item.brand ?? ''));

  const signalScores = deriveScoreCardsFromSignals({
    family,
    priceTier: perfumeContext?.priceTier ?? '',
    rating: perfumeContext?.rating,
    notes: [...top, ...heart, ...base],
    contextMatched: Boolean(perfumeContext),
  });

  return {
    name,
    brand,
    year: Number.isFinite(Number(perfumeContext?.year)) ? Number(perfumeContext?.year) : null,
    family,
    concentration: cleanString(perfumeContext?.concentration) || null,
    topNotes: top,
    heartNotes: heart,
    baseNotes: base,
    keyMolecules: fallbackMolecules.map((item, index) => ({
      name: item.name,
      effect: item.effect || item.contribution || `${item.name} bu koku omurgasini destekler.`,
      percentage: index > 0 && !isPro ? 'Pro ile goruntule' : item.percentage || 'Akor tasiyici',
    })),
    sillage:
      toSillageLabelFromScore(perfumeContext?.sillageScore) ||
      cleanString(perfumeContext?.sillage) ||
      'orta',
    longevityHours:
      toLongevityHoursFromScore(perfumeContext?.longevityScore) ?? { min: 4, max: 7 },
    seasons:
      Array.isArray(perfumeContext?.seasons) && perfumeContext.seasons.length > 0
        ? perfumeContext.seasons
        : ['Ilkbahar', 'Sonbahar'],
    occasions:
      Array.isArray(perfumeContext?.occasions) && perfumeContext.occasions.length > 0
        ? perfumeContext.occasions
        : ['Gunluk'],
    ageProfile: cleanString(perfumeContext?.ageProfile) || 'Yetiskin profil',
    genderProfile:
      cleanString(perfumeContext?.genderProfile) || cleanString(perfumeContext?.gender) || 'Unisex',
    moodProfile: `${name} icin dataset destekli acil analiz uretildi. Profil ${family.toLowerCase()} omurgada konumlaniyor.`,
    expertComment:
      'Saglayici yogunlugu nedeniyle bu cevap dataset tabanli acil katmandan olusturuldu. Nota ve molekul baglari katalogdaki kanitlarla esitlenerek secildi. Sonuc, girdiye ozel omurgaya gore kuruldu ve ilk firsatta AI yorumu ile guncellenecektir.',
    layeringTip: isPro
      ? 'Benzer ailede temiz bir acilis notasiyla katmanlayarak derinligi dengede tut.'
      : 'Pro ile goruntule',
    applicationTip: isPro
      ? 'Tenin sicak noktalarina 2-3 fis uygula, 20 dakika sonra ikinci katmani degerlendir.'
      : 'Pro ile goruntule',
    similarFragrances: fallbackSimilar,
    valueScore: signalScores.value,
    uniquenessScore: signalScores.uniqueness,
    wearabilityScore: signalScores.wearability,
    __fallbackReason: cleanString(providerError) || 'provider_unavailable',
    __fallbackMode: mode,
  };
}
