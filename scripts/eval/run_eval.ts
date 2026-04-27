/**
 * Koku Dedektifi — Gold Dataset Eval Script
 *
 * Kullanım:
 *   npx ts-node --project tsconfig.scripts.json scripts/eval/run_eval.ts
 *   npx ts-node --project tsconfig.scripts.json scripts/eval/run_eval.ts --category=popular
 *   npx ts-node --project tsconfig.scripts.json scripts/eval/run_eval.ts --item=gold_001
 *   npx ts-node --project tsconfig.scripts.json scripts/eval/run_eval.ts --dry-run
 *
 * Veya: npm run eval
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Yapılandırma ─────────────────────────────────────────────────────────────
const API_BASE_URL = (process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000').replace(/\/$/, '');
const IMAGES_DIR = path.resolve(__dirname, '../../assets/gold_images');
const DATASET_PATH = path.resolve(__dirname, '../../docs/gold_dataset/perfume_gold_dataset_v1_2.json');
const OUTPUT_DIR = path.resolve(__dirname, '../../docs/eval');
const RATE_LIMIT_MS = 4000;
const RUN_INTERVAL_MS = 6000; // run_count:3 item'larda runlar arası bekleme

// ─── NOTE_SYNONYMS (scoring_rules.md §3 — birebir kopya) ─────────────────────
const NOTE_SYNONYMS: Record<string, string[]> = {
  // === CITRUS ===
  "bergamot": ["calabrian bergamot", "italian bergamot", "bergamotto", "bergamot oil"],
  "grapefruit": ["pamplemousse", "greyfurt", "pompelmo"],
  "lemon": ["citron", "limon", "lemon zest", "limon kabuğu"],
  "mandarin": ["mandarin orange", "tangerine", "mandalina", "satsuma"],
  "orange": ["sweet orange", "portakal", "bitter orange", "blood orange"],
  "lime": ["persian lime", "misket limonu", "key lime"],
  "yuzu": ["yuzu citrus"],

  // === FLORAL ===
  "rose": ["rose absolute", "bulgarian rose", "turkish rose", "damask rose",
           "rosa centifolia", "gül", "gul", "rose oil", "may rose"],
  "jasmine": ["jasmine absolute", "jasminum officinale", "yasemin", "white jasmine",
              "jasmine flower"],
  "jasmine sambac": ["jasmine", "sambac jasmine", "arabian jasmine",
                     "jasminum sambac", "yasemin", "sambac"],
  "orange blossom": ["neroli", "portakal çiçeği", "portakal cicegi",
                     "bigarade", "fleur d'oranger", "orange flower"],
  "iris": ["orris root", "orris", "iris root", "iris absolute", "iris butter",
           "süsen", "susen", "orris concrete"],
  "lavender": ["lavandin", "spike lavender", "lavanda", "lavanta",
               "lavandula", "lavender flower"],
  "lavender absolute": ["lavender", "lavandin absolute", "lavanta absolutu",
                        "lavender oil"],
  "violet": ["violet flower", "menekşe", "menekse", "parma violet",
             "violet absolute"],
  "violet leaf": ["violet leaves", "violet foliage", "feuille de violette"],
  "tuberose": ["tuberosa", "polyanthes tuberosa", "tuberoz", "rajnigandha",
               "tuberose flower"],
  "tuberose absolute": ["tuberose", "tuberose concrete", "tubereuse"],
  "lily of the valley": ["muguet", "convallaria", "vadi zambağı", "lily"],
  "geranium": ["pelargonium", "rose geranium", "pelargon", "geranium bourbon"],
  "ylang ylang": ["cananga odorata", "ylang", "ilang ilang", "cananga"],
  "magnolia": ["magnolya", "magnolia champaca", "magnolia flower"],
  "heliotrope": ["cherry pie", "heliotrop", "heliotropin"],
  "osmanthus": ["osmantus", "osmanthus fragrans", "sweet osmanthus"],
  "peony": ["paeonia", "şakayık", "sakayik"],
  "carnation": ["clove pink", "karanfil çiçeği", "oeillet"],
  "mimosa": ["acacia mimosa", "mimosa absolute", "wattle"],
  "lily": ["lily of the valley", "muguet", "zambak"],

  // === WOODY / RESINOUS ===
  "cedar": ["cedarwood", "virginia cedar", "atlas cedar", "himalayan cedar",
            "sedir", "sedir agaci", "cedrus"],
  "sandalwood": ["mysore sandalwood", "australian sandalwood",
                 "sandal ağacı", "sandal agaci", "santalum", "sandal wood"],
  "vetiver": ["vetivert", "vetiver absolute", "vetiver java", "khus",
              "vetiver bourbon"],
  "patchouli": ["patchouly", "pachuli", "paçuli", "paculi",
                "pogostemon cablin", "patchouli heart", "patchouli alcohol"],
  "oakmoss": ["oak moss", "mousse de chêne", "meşe yosunu", "mese yosunu",
              "evernia prunastri"],
  "birch tar accord": ["birch tar", "dry birch", "birch", "russian leather",
                       "huş katranı", "hus katrani", "birch note"],
  "oud accord": ["oud", "agarwood", "oud absolute", "ud", "agar", "oudh",
                 "oud wood"],
  "amber accord": ["amber", "ambre", "kehribar", "ambra", "amber note"],
  "amberwood": ["amber wood", "kehribar odunu", "ambroxan amber",
                "amber woody"],
  "labdanum": ["cistus", "cistus labdanum", "rockrose", "labdanum absolute",
               "cistus ladaniferus", "labdanum resinoid"],
  "benzoin": ["styrax benzoin", "siam benzoin", "benzoin resinoid",
              "gum benzoin", "benzoé"],
  "incense": ["olibanum", "frankincense", "tütsü", "tutusu", "gunluk",
              "boswellia", "church incense"],
  "olibanum": ["frankincense", "boswellia", "tütsü", "tutusu",
               "olibanum absolute"],
  "guaiac wood": ["guaiacwood", "bulnesia sarmientoi", "palo santo",
                  "guayaco"],
  "myrrh": ["commiphora", "mür"],
  "elemi": ["elemi resinoid", "elemi gum"],
  "cistus": ["labdanum", "rockrose", "cistus labdanum"],
  "fir balsam": ["fir resin", "balsam fir", "gümüşi köknar reçinesi"],
  "pine": ["pine needle", "çam", "pine resin"],

  // === ORIENTAL / SWEET ===
  "vanilla": ["vanillin", "vanilla absolute", "bourbon vanilla",
              "madagascar vanilla", "vanilla planifolia", "vanilya",
              "vanilla bean", "vanilla oleoresin"],
  "tonka bean": ["tonka", "fève tonka", "tonka fasulyesi",
                 "dipteryx odorata", "coumarin"],
  "tonka": ["tonka bean", "fève tonka", "tonka fasulyesi",
            "dipteryx odorata"],
  "coumarin": ["hay", "grass", "new mown hay", "tonka"],
  "ethyl maltol": ["cotton candy note", "caramelized sugar", "karamel",
                   "candy note", "malty sweet"],
  "honey": ["beeswax", "bal", "miel", "honey accord", "bees wax"],
  "praline": ["pralin", "almond praline", "caramelized almond"],
  "caramel": ["toffee", "karamel", "butterscotch"],

  // === SMOKY / LEATHERY ===
  "leather accord": ["leather", "cuir", "deri", "birch leather",
                     "leather note"],
  "tobacco absolute": ["tobacco", "tobacco leaf", "latakia", "tütün",
                       "tutun", "tabac", "tobacco flower"],
  "tobacco": ["tobacco absolute", "tobacco leaf", "tütün", "tutun",
              "tabac", "virginia tobacco"],

  // === AQUATIC / FRESH ===
  "calone": ["sea notes", "watermelon ketone", "aquatic note", "aquozone"],
  "sea notes": ["marine notes", "ocean notes", "aquatic notes",
                "deniz notaları", "deniz notalari", "aquozone", "oceanic"],
  "mineral notes": ["flint", "stone", "minerality", "mineral",
                    "mineral accord", "taş", "tas"],

  // === SPICY ===
  "black pepper": ["pepper", "poivre noir", "biber", "karabiber",
                   "piper nigrum", "white pepper"],
  "pink pepper": ["rose pepper", "schinus molle", "pembe biber",
                  "poivre rose", "pink peppercorn"],
  "cardamom": ["green cardamom", "kakule", "elettaria cardamomum",
               "cardamom seed"],
  "ginger": ["zingiber officinale", "zencefil", "ginger root"],
  "cinnamon": ["ceylon cinnamon", "cassia", "tarçın", "tarcin",
               "cinnamon bark"],
  "clove": ["clove bud", "karanfil", "syzygium aromaticum"],
  "nutmeg": ["myristica fragrans", "muskat", "muskatcevizi", "mace"],
  "cumin": ["kimyon", "cuminum cyminum"],
  "saffron": ["safran", "crocus sativus", "saffron absolute"],

  // === FRUITY ===
  "black currant": ["blackcurrant", "cassis", "ribes nigrum",
                    "siyah frenk üzümü", "siyah frenk uzumu"],
  "blackcurrant": ["black currant", "cassis", "ribes nigrum",
                   "siyah frenk üzümü"],
  "pineapple accord": ["pineapple", "ananas", "ananas accord", "pineapple note"],
  "apple": ["malus domestica", "elma", "green apple", "red apple"],
  "pear": ["armut", "pyrus", "pear accord"],
  "peach": ["şeftali", "seftali", "pêche", "peach blossom"],
  "plum": ["erik", "prunus", "damson", "prune"],
  "raspberry": ["ahududu", "framboise", "raspberry accord"],
  "strawberry": ["çilek", "cilek", "fraise"],

  // === KEY SYNTHETIC MOLECULES ===
  "ambroxan": ["ambroxide", "ambrox", "ambrofix", "cetalox",
               "ambrox super", "ambrocenide"],
  "ambergris accord": ["ambergris", "grey amber", "amber gris",
                       "ambroxan", "ambergris note"],
  "iso e super": ["iso-e-super", "isoe super", "javanol",
                  "cedryl methyl ether", "iso e"],
  "hedione": ["dihydrojasmonate", "methyl dihydrojasmonate",
              "methyl jasmonate", "hedione hc"],
  "methyl pamplemousse": ["methyl pamplemousse accord",
                          "grapefruit carbaldehyde"],
  "lemon verbena": ["vervain", "verbena", "limon otu", "lippia citriodora"],
  "coffee accord": ["coffee", "kahve", "coffee note", "coffea arabica",
                    "roasted coffee"],
  "cocoa absolute": ["cocoa", "cacao", "chocolate note", "kakao",
                     "cacao absolute"],
  "rosemary absolute": ["rosemary", "biberiye", "rosmarinus officinalis"],
  "rose absolute": ["rose", "gül", "gul", "rose otto"],
  "iris absolute": ["iris", "orris absolute", "orris butter", "iris root", "irone", "alpha-irone"],

  // === MUSK ===
  "musk": ["white musk", "clean musk", "musks", "misk",
           "musc", "musque"],
  "white musk": ["musk", "clean musk", "musks", "sheer musk"],
  "cashmeran": ["cashmere wood", "cashmeran accord", "cashmere note"],
  "woody notes": ["woodsy notes", "odunsu nota", "bois"],
  "oriental notes": ["oriental accord", "doğu notaları"],
};

// ─── BRAND_ABBREVIATIONS (scoring_rules.md §4) ───────────────────────────────
const BRAND_ABBREVIATIONS: Record<string, string> = {
  "ysl": "yves saint laurent",
  "mfk": "maison francis kurkdjian",
  "pdm": "parfums de marly",
  "jpg": "jean paul gaultier",
  "ch": "carolina herrera",
  "ga": "giorgio armani",
  "paco rabanne": "rabanne",
  "rabanne": "paco rabanne",
  "lancome": "lancôme",
  "bvlgari": "bulgari",
  "bulgari": "bvlgari",
  "viktor rolf": "viktor&rolf",
  "viktor & rolf": "viktor&rolf",
  "viktor&rolf": "viktor&rolf",
  "jp gaultier": "jean paul gaultier",
  "creed boutique": "creed",
  "house of creed": "creed",
};

// ─── THRESHOLDS (scoring_rules.md §10) ───────────────────────────────────────
const THRESHOLDS = {
  M1_is_perfume_accuracy:  { pass: 0.90, direction: 'gte' as const },
  M2_brand_accuracy:       { pass: 0.70, direction: 'gte' as const },
  M3_name_fuzzy:           { pass: 0.65, direction: 'gte' as const },
  M4_concentration:        { pass: 0.55, direction: 'gte' as const },
  M5_gender_accuracy:      { pass: 0.75, direction: 'gte' as const },
  M6_notes_f1:             { pass: 0.35, direction: 'gte' as const },
  M7_molecule_precision:   { pass: 0.45, direction: 'gte' as const },
  M8_molecule_recall:      { pass: 0.30, direction: 'gte' as const },
  M9_brier_score:          { pass: 0.22, direction: 'lte' as const },
  M10_consistency_jaccard: { pass: 0.55, direction: 'gte' as const },
  M11_latency_p95_ms:      { pass: 10000, direction: 'lte' as const },
  M12_false_positive_rate: { pass: 0.15, direction: 'lte' as const },
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface GoldItem {
  id: string;
  image: string;
  category: 'real' | 'popular' | 'niche' | 'trap';
  expected_is_perfume: boolean;
  expected_brand: string | null;
  expected_name: string | null;
  expected_concentration: string | null;
  expected_gender: string | null;
  expected_top_notes: string[];
  expected_heart_notes: string[];
  expected_base_notes: string[];
  expected_molecules_verified: string[];
  run_count?: number;
  consistency_group?: string;
  notes_match_mode: string;
  expected_behavior?: string;
  alt_images?: string[];
}

interface GoldDataset {
  manifest: { total_items: number; breakdown: Record<string, number> };
  items: GoldItem[];
}

interface ApiMolecule {
  name: string;
  evidenceLevel?: string | null;
}

interface ApiAnalysisResult {
  id?: string;
  name: string;
  brand?: string | null;
  concentration?: string | null;
  genderProfile?: string | null;
  pyramid?: { top: string[]; middle: string[]; base: string[] } | null;
  // Top-level note fields (fallback in case pyramid is absent)
  topNotes?: string[];
  heartNotes?: string[];
  baseNotes?: string[];
  molecules?: ApiMolecule[];
  confidence?: number | null;
  confidenceScore?: number | null;
}

interface ApiResponse {
  analysis?: ApiAnalysisResult;
  error?: string;
}

interface RunResult {
  analysis: ApiAnalysisResult;
  latencyMs: number;
  runIndex: number;
  error?: string;
}

interface ItemScore {
  id: string;
  category: string;
  m1: number;   // is_perfume: 1 or 0
  m2: number | null;   // brand: 1 or 0 or null
  m3: number | null;   // name: 1 or 0 or null
  m4: number | null;   // concentration: 0-1 or null
  m5: number | null;   // gender: 1 or 0 or null
  m6: number | null;   // notes F1 or null
  m7: number | null;   // molecule precision or null
  m8: number | null;   // molecule recall or null
  // M9/M10 computed aggregate later
  predictedConfidence: number;  // 0-100
  isCorrect: boolean;           // for Brier
  latencyMs: number;
  failReasons: string[];
  predictedIsPerfume: boolean;
  expectedIsPerfume: boolean;
  runs?: RunResult[];           // for run_count:3 items
  overConfidentId?: boolean;    // gold_056 special rule
}

interface AggregateMetrics {
  M1: number;
  M2: number;
  M3: number;
  M4: number;
  M5: number;
  M6: number;
  M7: number;
  M8: number;
  M9: number;
  M10: number;
  M11_p50: number;
  M11_p95: number;
  M11_p99: number;
  M12: number;
  overConfidentCount: number;
}

// ─── Synonym Lookup ───────────────────────────────────────────────────────────
function buildSynonymLookup(map: Record<string, string[]>): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const [canonical, synonyms] of Object.entries(map)) {
    const canon = canonical.toLowerCase().trim();
    lookup.set(canon, canon);
    for (const syn of synonyms) {
      const s = syn.toLowerCase().trim();
      if (!lookup.has(s)) lookup.set(s, canon);
    }
  }
  return lookup;
}

const SYNONYM_LOOKUP = buildSynonymLookup(NOTE_SYNONYMS);

// ─── Utilities ────────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] = a[i - 1] === b[j - 1]
        ? dp[i - 1]![j - 1]!
        : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }
  return dp[m]![n]!;
}

function normalizeStr(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.toLowerCase().trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // strip combining diacritics: ü→u, ç→c, ş→s …
    .replace(/\s+/g, ' ');
}

function canonicalNote(note: string): string {
  const n = normalizeStr(note);
  return SYNONYM_LOOKUP.get(n) ?? n;
}

function notesMatch(a: string, b: string): boolean {
  if (normalizeStr(a) === normalizeStr(b)) return true;
  return canonicalNote(a) === canonicalNote(b);
}

function normalizeBrand(brand: string): string {
  const n = normalizeStr(brand);
  return BRAND_ABBREVIATIONS[n] ?? n;
}

function brandsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const na = normalizeBrand(a);
  const nb = normalizeBrand(b);
  return na === nb;
}

function concentrationPartialScore(predicted: string | null | undefined, expected: string | null | undefined): number {
  if (!predicted || !expected) return 0;
  const p = normalizeStr(predicted);
  const e = normalizeStr(expected);
  if (p === e) return 1.0;
  const concGroup: Record<string, number> = {
    'parfum': 5, 'extrait de parfum': 5, 'extrait': 5,
    'edp': 4, 'eau de parfum': 4,
    'edt': 3, 'eau de toilette': 3,
    'edc': 2, 'eau de cologne': 2,
    'parfum cologne': 4.5,
  };
  const pg = concGroup[p];
  const eg = concGroup[e];
  if (pg === undefined || eg === undefined) return 0;
  const diff = Math.abs(pg - eg);
  if (diff === 0) return 1.0;
  if (diff <= 0.5) return 0.75;
  if (diff <= 1) return 0.5;
  if (diff <= 2) return 0.25;
  return 0;
}

function normalizeGender(g: string | null | undefined): string | null {
  if (!g) return null;
  const n = normalizeStr(g);
  // Check female/feminen FIRST — 'female' contains 'male' as substring
  if (/feminen|feminine|female|kadin/.test(n)) return 'female';
  if (/maskulen|masculine|\bmale\b|erkek/.test(n)) return 'male';
  if (/unisex/.test(n)) return 'unisex';
  return n;
}

// Yalnızca gerçek non-perfume ürün türlerini listele.
// "bilinmiyor"/"unknown" parfüm için geçerli belirsizlik ifadesiyken
// deodorant/room spray kesinlikle parfüm değildir.
const NON_PERFUME_KEYWORDS = [
  'deodorant', 'body spray', 'room spray', 'oda spreyi', 'deodoran',
  'ev kokusu', 'tekstil spreyi', 'home fragrance', 'air freshener',
];

function predictIsPerfume(analysis: ApiAnalysisResult): boolean {
  const confidence = analysis.confidence ?? analysis.confidenceScore ?? 0;
  const name = (analysis.name ?? '').toLowerCase();
  if (NON_PERFUME_KEYWORDS.some(kw => name.includes(kw))) return false;
  if (confidence < 25) return false;
  return true;
}

function getConfidence(analysis: ApiAnalysisResult): number {
  return Math.min(analysis.confidence ?? analysis.confidenceScore ?? 0, 100);
}

function getAllNotes(analysis: ApiAnalysisResult): string[] {
  if (!analysis.pyramid) return [];
  return [
    ...(analysis.pyramid.top ?? []),
    ...(analysis.pyramid.middle ?? []),
    ...(analysis.pyramid.base ?? []),
  ].filter(Boolean);
}

function getExpectedAllNotes(item: GoldItem): string[] {
  return [
    ...item.expected_top_notes,
    ...item.expected_heart_notes,
    ...item.expected_base_notes,
  ].filter(Boolean);
}

function computeNotesF1(predicted: string[], expected: string[]): number {
  if (predicted.length === 0 && expected.length === 0) return 1.0;
  if (predicted.length === 0 || expected.length === 0) return 0;
  let tpPred = 0;
  for (const p of predicted) {
    if (expected.some(e => notesMatch(p, e))) tpPred++;
  }
  let tpExp = 0;
  for (const e of expected) {
    if (predicted.some(p => notesMatch(p, e))) tpExp++;
  }
  const precision = tpPred / predicted.length;
  const recall = tpExp / expected.length;
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

function getVerifiedMolecules(analysis: ApiAnalysisResult): string[] {
  if (!analysis.molecules) return [];
  return analysis.molecules
    .filter(m => m.evidenceLevel === 'verified_component' || m.evidenceLevel === 'signature_molecule')
    .map(m => m.name)
    .filter(Boolean);
}

function computeMoleculePrecision(predicted: string[], expected: string[]): number {
  if (predicted.length === 0) return 0;
  const tp = predicted.filter(p => expected.some(e => notesMatch(p, e))).length;
  return tp / predicted.length;
}

function computeMoleculeRecall(predicted: string[], expected: string[]): number {
  if (expected.length === 0) return 1.0;
  const tp = expected.filter(e => predicted.some(p => notesMatch(p, e))).length;
  return tp / expected.length;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(sorted.length * p / 100) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))]!;
}

function stdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function jaccardNotes(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1.0;
  const setA = a.map(n => canonicalNote(n));
  const setB = b.map(n => canonicalNote(n));
  const union = new Set([...setA, ...setB]);
  const intersection = setA.filter(n => setB.includes(n)).length;
  return intersection / union.size;
}

function now(): string {
  const d = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function passEmoji(pass: boolean): string {
  return pass ? '✅ PASS' : '❌ FAIL';
}

// ─── API ──────────────────────────────────────────────────────────────────────
async function callAnalyzeApi(
  imageBase64: string,
  inputSuffix = '',
): Promise<{ analysis: ApiAnalysisResult; latencyMs: number }> {
  const start = Date.now();

  // API beklentisi: { mode: 'image', imageBase64: '<raw base64>' }
  // LLMRouter normalizeImageInput() eksik prefix'i otomatik ekler.
  const body: Record<string, string> = {
    mode: 'image',
    imageBase64,
  };
  if (inputSuffix) body['input'] = inputSuffix;

  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-eval-secret': process.env.EVAL_SECRET || '',
    },
    body: JSON.stringify(body),
  });
  const latencyMs = Date.now() - start;

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
  }

  const json = (await response.json()) as ApiResponse;
  if (!json.analysis) {
    throw new Error(`API yanıtında 'analysis' alanı yok: ${JSON.stringify(json).slice(0, 200)}`);
  }
  return { analysis: json.analysis, latencyMs };
}

function makeDryRunResult(item: GoldItem): ApiAnalysisResult {
  const allNotes = getExpectedAllNotes(item);
  return {
    name: item.expected_name ?? 'Bilinmiyor',
    brand: item.expected_brand,
    concentration: item.expected_concentration,
    genderProfile: item.expected_gender === 'male' ? 'Maskülen'
      : item.expected_gender === 'female' ? 'Feminen' : 'Unisex',
    pyramid: {
      top: item.expected_top_notes,
      middle: item.expected_heart_notes,
      base: item.expected_base_notes,
    },
    molecules: item.expected_molecules_verified.map(n => ({
      name: n,
      evidenceLevel: 'verified_component',
    })),
    confidence: item.expected_is_perfume ? 80 : 15,
    confidenceScore: item.expected_is_perfume ? 80 : 15,
  };
}

// ─── Item Scorer ──────────────────────────────────────────────────────────────
function scoreItem(item: GoldItem, analysis: ApiAnalysisResult, latencyMs: number): ItemScore {
  const failReasons: string[] = [];
  const confidence = getConfidence(analysis);
  const predictedIsPerfume = predictIsPerfume(analysis);

  // M1
  const m1 = predictedIsPerfume === item.expected_is_perfume ? 1 : 0;
  if (m1 === 0) {
    failReasons.push(`M1: is_perfume tahmin=${predictedIsPerfume} beklenen=${item.expected_is_perfume}`);
  }

  // Skip M2-M8 for items with null expected fields (gold_056)
  const hasExpectedIdentity = item.expected_brand !== null && item.expected_name !== null;

  // M2
  let m2: number | null = null;
  if (hasExpectedIdentity) {
    m2 = brandsMatch(analysis.brand, item.expected_brand) ? 1 : 0;
    if (m2 === 0) {
      failReasons.push(`M2: brand="${analysis.brand}" beklenen="${item.expected_brand}"`);
    }
  }

  // M3
  let m3: number | null = null;
  if (hasExpectedIdentity && item.expected_name) {
    const pn = normalizeStr(analysis.name ?? '');
    const en = normalizeStr(item.expected_name);
    const exact = pn === en;
    const lev = levenshtein(pn, en) <= 2;
    const sub = pn.includes(en) || en.includes(pn);
    m3 = (exact || lev || sub) ? 1 : 0;
    if (m3 === 0) {
      failReasons.push(`M3: name="${analysis.name}" beklenen="${item.expected_name}"`);
    }
  }

  // M4
  let m4: number | null = null;
  if (item.expected_concentration && !['deodorant', 'room_spray'].includes(item.expected_concentration)) {
    m4 = concentrationPartialScore(analysis.concentration, item.expected_concentration);
    if (m4 < 0.5) {
      failReasons.push(`M4: concentration="${analysis.concentration}" beklenen="${item.expected_concentration}" puan=${m4.toFixed(2)}`);
    }
  }

  // M5
  let m5: number | null = null;
  if (item.expected_gender) {
    const pg = normalizeGender(analysis.genderProfile);
    const eg = normalizeGender(item.expected_gender);
    m5 = pg === eg ? 1 : 0;
    if (m5 === 0) {
      failReasons.push(`M5: gender="${analysis.genderProfile}" beklenen="${item.expected_gender}"`);
    }
  }

  // M6
  const predictedNotes = getAllNotes(analysis);
  const expectedNotes = getExpectedAllNotes(item);
  let m6: number | null = null;
  if (expectedNotes.length > 0) {
    m6 = computeNotesF1(predictedNotes, expectedNotes);
    if (m6 < 0.2) {
      failReasons.push(`M6: notes F1=${m6.toFixed(3)} (pred: ${predictedNotes.slice(0, 5).join(', ')}...)`);
    }
  }

  // M7 / M8
  const predictedVerified = getVerifiedMolecules(analysis);
  const expectedVerified = item.expected_molecules_verified;
  let m7: number | null = null;
  let m8: number | null = null;
  if (expectedVerified.length > 0) {
    if (predictedVerified.length > 0) {
      m7 = computeMoleculePrecision(predictedVerified, expectedVerified);
    }
    m8 = computeMoleculeRecall(predictedVerified, expectedVerified);
    if (m8 !== null && m8 < 0.2) {
      failReasons.push(`M8: molecule recall=${m8.toFixed(3)} (pred: ${predictedVerified.slice(0, 3).join(', ')})`);
    }
  }

  // For Brier score — isCorrect = brand AND name both correct
  const isCorrect = (m2 === 1) && (m3 === 1);

  // gold_056 special rule
  let overConfidentId = false;
  if (item.id === 'gold_056' && confidence >= 70 && analysis.brand) {
    overConfidentId = true;
    failReasons.push(`gold_056: over_confident_identification (confidence=${confidence}, brand="${analysis.brand}")`);
  }

  return {
    id: item.id,
    category: item.category,
    m1, m2, m3, m4, m5, m6, m7, m8,
    predictedConfidence: confidence,
    isCorrect,
    latencyMs,
    failReasons,
    predictedIsPerfume,
    expectedIsPerfume: item.expected_is_perfume,
    overConfidentId,
  };
}

// ─── Aggregate Metrics ────────────────────────────────────────────────────────
function computeAggregates(
  scores: ItemScore[],
  consistencyResults: ConsistencyResult[],
): AggregateMetrics {
  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  // M1
  const M1 = avg(scores.map(s => s.m1));

  // M2
  const m2vals = scores.filter(s => s.m2 !== null).map(s => s.m2 as number);
  const M2 = avg(m2vals);

  // M3
  const m3vals = scores.filter(s => s.m3 !== null).map(s => s.m3 as number);
  const M3 = avg(m3vals);

  // M4
  const m4vals = scores.filter(s => s.m4 !== null).map(s => s.m4 as number);
  const M4 = avg(m4vals);

  // M5
  const m5vals = scores.filter(s => s.m5 !== null).map(s => s.m5 as number);
  const M5 = avg(m5vals);

  // M6
  const m6vals = scores.filter(s => s.m6 !== null).map(s => s.m6 as number);
  const M6 = avg(m6vals);

  // M7
  const m7vals = scores.filter(s => s.m7 !== null).map(s => s.m7 as number);
  const M7 = avg(m7vals);

  // M8
  const m8vals = scores.filter(s => s.m8 !== null).map(s => s.m8 as number);
  const M8 = avg(m8vals);

  // M9 — Brier
  const brierTerms = scores.map(s => {
    const p = s.predictedConfidence / 100;
    const o = s.isCorrect ? 1 : 0;
    return (p - o) ** 2;
  });
  const M9 = avg(brierTerms);

  // M10 — Consistency
  const M10 = consistencyResults.length > 0
    ? avg(consistencyResults.map(r => r.avgJaccard))
    : 1.0;

  // M11 — Latency
  const latencies = scores.map(s => s.latencyMs).filter(l => l > 0).sort((a, b) => a - b);
  const M11_p50 = percentile(latencies, 50);
  const M11_p95 = percentile(latencies, 95);
  const M11_p99 = percentile(latencies, 99);

  // M12 — False Positive Rate
  const negItems = scores.filter(s => !s.expectedIsPerfume);
  const fps = negItems.filter(s => s.predictedIsPerfume).length;
  const M12 = negItems.length > 0 ? fps / negItems.length : 0;

  // Over-confident count
  const overConfidentCount = scores.filter(s => s.overConfidentId).length;

  return { M1, M2, M3, M4, M5, M6, M7, M8, M9, M10, M11_p50, M11_p95, M11_p99, M12, overConfidentCount };
}

interface ConsistencyResult {
  id: string;
  avgJaccard: number;
  confidenceStdDev: number;
  runs: Array<{ notes: string[]; confidence: number }>;
}

function computeConsistency(
  item: GoldItem,
  runs: RunResult[],
): ConsistencyResult {
  const runData = runs.map(r => ({
    notes: getAllNotes(r.analysis),
    confidence: getConfidence(r.analysis),
  }));

  const pairs = [
    [0, 1], [0, 2], [1, 2],
  ] as const;

  const jaccards = pairs
    .filter(([a, b]) => runData[a] !== undefined && runData[b] !== undefined)
    .map(([a, b]) => jaccardNotes(runData[a]!.notes, runData[b]!.notes));

  const avgJaccard = jaccards.length > 0
    ? jaccards.reduce((a, b) => a + b, 0) / jaccards.length
    : 1.0;

  const confidences = runData.map(r => r.confidence);
  const confidenceStdDev = stdDev(confidences);

  return { id: item.id, avgJaccard, confidenceStdDev, runs: runData };
}

// ─── Report Generator ─────────────────────────────────────────────────────────
function buildReport(
  scores: ItemScore[],
  consistency: ConsistencyResult[],
  metrics: AggregateMetrics,
  startTime: Date,
  dryRun: boolean,
  categoryFilter: string | null,
  itemFilter: string | null,
): string {
  const ts = now();
  const totalItems = scores.length;
  const categories = ['real', 'popular', 'niche', 'trap'] as const;

  const isPass = (val: number, key: keyof typeof THRESHOLDS): boolean => {
    const t = THRESHOLDS[key];
    return t.direction === 'gte' ? val >= t.pass : val <= t.pass;
  };

  const fmt = (n: number, digits = 3) => n.toFixed(digits);
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  let md = `# 🔬 Koku Dedektifi — Eval Raporu\n\n`;
  md += `**Tarih:** ${startTime.toLocaleString('tr-TR')}\n`;
  md += `**Dataset:** perfume_gold_dataset_v1_2.json (${totalItems} item${categoryFilter ? ` — kategori: ${categoryFilter}` : ''}${itemFilter ? ` — item: ${itemFilter}` : ''})\n`;
  md += `**API:** ${API_BASE_URL}\n`;
  if (dryRun) md += `**⚠️ DRY-RUN modu — API çağrısı yapılmadı**\n`;
  md += `\n---\n\n`;

  // ─── Summary Table
  md += `## 📊 Özet Tablo\n\n`;
  md += `| Metrik | Açıklama | Hedef | Gerçek | Durum |\n`;
  md += `|--------|-----------|-------|--------|-------|\n`;

  const rows = [
    { key: 'M1_is_perfume_accuracy' as const, label: 'M1', desc: 'is_perfume doğruluğu', val: metrics.M1 },
    { key: 'M2_brand_accuracy' as const, label: 'M2', desc: 'Brand doğruluğu', val: metrics.M2 },
    { key: 'M3_name_fuzzy' as const, label: 'M3', desc: 'Name fuzzy match', val: metrics.M3 },
    { key: 'M4_concentration' as const, label: 'M4', desc: 'Concentration (partial)', val: metrics.M4 },
    { key: 'M5_gender_accuracy' as const, label: 'M5', desc: 'Gender doğruluğu', val: metrics.M5 },
    { key: 'M6_notes_f1' as const, label: 'M6', desc: 'Notes F1 (synonym-aware)', val: metrics.M6 },
    { key: 'M7_molecule_precision' as const, label: 'M7', desc: 'Molecule precision (verified)', val: metrics.M7 },
    { key: 'M8_molecule_recall' as const, label: 'M8', desc: 'Molecule recall (verified)', val: metrics.M8 },
    { key: 'M9_brier_score' as const, label: 'M9', desc: 'Brier score (kalibrasyon)', val: metrics.M9 },
    { key: 'M10_consistency_jaccard' as const, label: 'M10', desc: 'Consistency Jaccard', val: metrics.M10 },
    { key: 'M12_false_positive_rate' as const, label: 'M12', desc: 'False positive rate', val: metrics.M12 },
  ];

  for (const { key, label, desc, val } of rows) {
    const t = THRESHOLDS[key];
    const threshold = t.direction === 'gte' ? `≥ ${fmt(t.pass)}` : `≤ ${fmt(t.pass)}`;
    md += `| **${label}** | ${desc} | ${threshold} | **${fmt(val)}** | ${passEmoji(isPass(val, key))} |\n`;
  }

  // Latency separate
  const latencyPass = isPass(metrics.M11_p95, 'M11_latency_p95_ms');
  md += `| **M11** | Latency p95 (ms) | ≤ ${THRESHOLDS.M11_latency_p95_ms.pass}ms | **${Math.round(metrics.M11_p95)}ms** | ${dryRun ? '⚪ SKIP' : passEmoji(latencyPass)} |\n`;

  if (metrics.overConfidentCount > 0) {
    md += `\n> ⚠️ **gold_056 over_confident_identification:** ${metrics.overConfidentCount} kez\n`;
  }

  md += `\n---\n\n`;

  // ─── Category Breakdown
  md += `## 📁 Kategori Bazlı Breakdown\n\n`;
  for (const cat of categories) {
    const catItems = scores.filter(s => s.category === cat);
    if (catItems.length === 0) continue;

    md += `### ${cat.charAt(0).toUpperCase() + cat.slice(1)} (${catItems.length} item)\n\n`;
    md += `| Metrik | Skor | Item Sayısı |\n`;
    md += `|--------|------|-------------|\n`;

    const catAvg = (field: 'm1' | 'm2' | 'm3' | 'm4' | 'm5' | 'm6' | 'm7' | 'm8') => {
      const vals = catItems.filter(s => s[field] !== null).map(s => s[field] as number);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };

    const catMetrics: Array<[string, 'm1' | 'm2' | 'm3' | 'm4' | 'm5' | 'm6' | 'm7' | 'm8']> = [
      ['M1 is_perfume', 'm1'], ['M2 brand', 'm2'], ['M3 name', 'm3'],
      ['M4 concentration', 'm4'], ['M5 gender', 'm5'], ['M6 notes F1', 'm6'],
      ['M7 mol. precision', 'm7'], ['M8 mol. recall', 'm8'],
    ];

    for (const [label, field] of catMetrics) {
      const val = catAvg(field);
      const n = catItems.filter(s => s[field] !== null).length;
      md += `| ${label} | ${val !== null ? fmt(val) : 'N/A'} | ${n} |\n`;
    }
    md += `\n`;
  }

  md += `---\n\n`;

  // ─── Failed Items
  const failedItems = scores.filter(s => s.failReasons.length > 0);
  md += `## ❌ Başarısız / Sorunlu Item'lar (${failedItems.length})\n\n`;

  if (failedItems.length === 0) {
    md += `Hiçbir item başarısız olmadı! 🎉\n\n`;
  } else {
    for (const s of failedItems) {
      md += `### ${s.id} — kategori: ${s.category}\n`;
      for (const r of s.failReasons) {
        md += `- ${r}\n`;
      }
      md += `\n`;
    }
  }

  md += `---\n\n`;

  // ─── Calibration Table (M9)
  md += `## 📈 Kalibrasyon Tablosu (M9 — Brier)\n\n`;
  md += `| Confidence Bucket | Item Sayısı | Ort. Doğruluk | Kalibrasyon Farkı |\n`;
  md += `|-------------------|-------------|---------------|-------------------|\n`;

  const buckets = [
    { label: '[0, 20)', lo: 0, hi: 20 },
    { label: '[20, 40)', lo: 20, hi: 40 },
    { label: '[40, 60)', lo: 40, hi: 60 },
    { label: '[60, 80)', lo: 60, hi: 80 },
    { label: '[80, 100]', lo: 80, hi: 101 },
  ];

  for (const { label, lo, hi } of buckets) {
    const bucket = scores.filter(s => s.predictedConfidence >= lo && s.predictedConfidence < hi);
    if (bucket.length === 0) {
      md += `| ${label} | 0 | — | — |\n`;
      continue;
    }
    const avgConf = bucket.reduce((a, s) => a + s.predictedConfidence, 0) / bucket.length / 100;
    const avgCorrect = bucket.filter(s => s.isCorrect).length / bucket.length;
    const diff = avgConf - avgCorrect;
    const diffStr = diff > 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3);
    const flag = Math.abs(diff) > 0.2 ? ' ⚠️' : '';
    md += `| ${label} | ${bucket.length} | ${pct(avgCorrect)} | ${diffStr}${flag} |\n`;
  }

  md += `\n> Brier Score (genel): **${fmt(metrics.M9)}** ${isPass(metrics.M9, 'M9_brier_score') ? '✅' : '❌'} (eşik ≤ ${THRESHOLDS.M9_brier_score.pass})\n`;
  md += `\n---\n\n`;

  // ─── Consistency Report
  md += `## 🔄 Consistency Raporu (M10)\n\n`;

  if (consistency.length === 0) {
    md += `run_count:3 olan item test edilmedi.\n\n`;
  } else {
    md += `| Item | Ort. Jaccard | Conf. StdDev | Durum |\n`;
    md += `|------|-------------|--------------|-------|\n`;
    for (const r of consistency) {
      const pass = r.avgJaccard >= THRESHOLDS.M10_consistency_jaccard.pass;
      md += `| ${r.id} | ${fmt(r.avgJaccard)} | ±${r.confidenceStdDev.toFixed(1)} | ${passEmoji(pass)} |\n`;
    }
    const avgJ = consistency.reduce((a, r) => a + r.avgJaccard, 0) / consistency.length;
    md += `\n**Genel ortalama Jaccard:** ${fmt(avgJ)}\n`;

    // Detailed runs
    md += `\n<details><summary>Run detayları</summary>\n\n`;
    for (const r of consistency) {
      md += `#### ${r.id}\n`;
      for (let i = 0; i < r.runs.length; i++) {
        const run = r.runs[i]!;
        md += `- Run ${i + 1}: confidence=${run.confidence} notes=[${run.notes.slice(0, 5).join(', ')}${run.notes.length > 5 ? '...' : ''}]\n`;
      }
    }
    md += `\n</details>\n`;
  }

  md += `\n---\n\n`;

  // ─── Latency
  md += `## ⏱️ Latency İstatistikleri (M11)\n\n`;
  if (dryRun) {
    md += `Dry-run modunda latency ölçülmedi.\n\n`;
  } else {
    const latencies = scores.map(s => s.latencyMs).filter(l => l > 0).sort((a, b) => a - b);
    md += `| İstatistik | Değer |\n`;
    md += `|-----------|-------|\n`;
    md += `| p50 | ${Math.round(metrics.M11_p50)}ms |\n`;
    md += `| p95 | **${Math.round(metrics.M11_p95)}ms** ${passEmoji(latencyPass)} |\n`;
    md += `| p99 | ${Math.round(metrics.M11_p99)}ms |\n`;
    md += `| Min | ${Math.min(...latencies)}ms |\n`;
    md += `| Max | ${Math.max(...latencies)}ms |\n`;
    md += `| Toplam API çağrısı | ${latencies.length} |\n`;
  }

  md += `\n---\n\n`;
  md += `_Rapor: ${startTime.toISOString()} • Eval script v1.2_\n`;

  return md;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const categoryFilter = args.find(a => a.startsWith('--category='))?.split('=')[1] ?? null;
  const itemFilter = args.find(a => a.startsWith('--item='))?.split('=')[1] ?? null;

  const startTime = new Date();
  console.log(`\n🔬 Koku Dedektifi Eval — ${startTime.toLocaleString('tr-TR')}`);
  if (dryRun) console.log('⚠️  DRY-RUN modu');
  if (categoryFilter) console.log(`📁 Kategori filtresi: ${categoryFilter}`);
  if (itemFilter) console.log(`🎯 Item filtresi: ${itemFilter}`);
  console.log(`🌐 API: ${API_BASE_URL}\n`);

  // Dataset yükle
  if (!fs.existsSync(DATASET_PATH)) {
    console.error(`❌ Dataset bulunamadı: ${DATASET_PATH}`);
    process.exit(1);
  }
  const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf-8')) as GoldDataset;
  let items = dataset.items;

  if (categoryFilter) items = items.filter(i => i.category === categoryFilter);
  if (itemFilter) items = items.filter(i => i.id === itemFilter);

  if (items.length === 0) {
    console.error('❌ Filtre sonrası item kalmadı.');
    process.exit(1);
  }

  console.log(`📋 Toplam ${items.length} item işlenecek\n`);

  // Output dir
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const scores: ItemScore[] = [];
  const consistencyResults: ConsistencyResult[] = [];

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx]!;
    const runCount = item.run_count ?? 1;
    const imagePath = path.join(IMAGES_DIR, item.image);

    console.log(`[${idx + 1}/${items.length}] ${item.id} (${item.category}) — ${item.image}`);

    if (!fs.existsSync(imagePath)) {
      console.warn(`  ⚠️  Görsel bulunamadı: ${imagePath} — skip`);
      continue;
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString('base64');

    if (runCount >= 3 && !dryRun) {
      // Consistency mode: 3 kez çalıştır
      const runs: RunResult[] = [];
      const suffixes = ['', '_r2', '_r3'];

      for (let r = 0; r < 3; r++) {
        await sleep(r === 0 ? RATE_LIMIT_MS : RUN_INTERVAL_MS);
        try {
          const { analysis, latencyMs } = await callAnalyzeApi(imageBase64, suffixes[r]!);
          runs.push({ analysis, latencyMs, runIndex: r + 1 });
          console.log(`  Run ${r + 1}/3 — ${latencyMs}ms — conf=${getConfidence(analysis)} — ${analysis.name ?? '?'}`);
        } catch (err) {
          console.error(`  ❌ Run ${r + 1} hatası: ${(err as Error).message}`);
          runs.push({
            analysis: { name: 'error' },
            latencyMs: 0,
            runIndex: r + 1,
            error: (err as Error).message,
          });
        }
      }

      // Score ilk run
      const firstRun = runs[0]!;
      const score = scoreItem(item, firstRun.analysis, firstRun.latencyMs);
      score.runs = runs;
      scores.push(score);

      // Consistency hesapla
      const successfulRuns = runs.filter(r => !r.error);
      if (successfulRuns.length >= 2) {
        const cr = computeConsistency(item, successfulRuns);
        consistencyResults.push(cr);
        console.log(`  Jaccard: ${cr.avgJaccard.toFixed(3)} | Conf StdDev: ±${cr.confidenceStdDev.toFixed(1)}`);
      }

    } else if (dryRun) {
      // Dry-run: mock result from ground truth
      const analysis = makeDryRunResult(item);
      const score = scoreItem(item, analysis, 0);
      scores.push(score);
      console.log(`  [dry] conf=${getConfidence(analysis)} — ${analysis.name}`);

    } else {
      // Normal: 1 kez
      await sleep(RATE_LIMIT_MS);
      try {
        const { analysis, latencyMs } = await callAnalyzeApi(imageBase64);
        const score = scoreItem(item, analysis, latencyMs);
        scores.push(score);
        const icons = [
          score.m1 === 1 ? '✅' : '❌',
          score.m2 === 1 ? 'B✓' : score.m2 === 0 ? 'B✗' : '',
          score.m3 === 1 ? 'N✓' : score.m3 === 0 ? 'N✗' : '',
        ].filter(Boolean).join(' ');
        console.log(`  ${latencyMs}ms — conf=${getConfidence(analysis)} — ${analysis.name ?? '?'} ${icons}`);
        if (score.failReasons.length > 0) {
          console.log(`  ⚠️  ${score.failReasons[0]}`);
        }
      } catch (err) {
        console.error(`  ❌ API hatası: ${(err as Error).message}`);
        scores.push({
          id: item.id, category: item.category,
          m1: 0, m2: null, m3: null, m4: null, m5: null,
          m6: null, m7: null, m8: null,
          predictedConfidence: 0, isCorrect: false, latencyMs: 0,
          failReasons: [`API hatası: ${(err as Error).message}`],
          predictedIsPerfume: false,
          expectedIsPerfume: item.expected_is_perfume,
        });
      }
    }
  }

  if (scores.length === 0) {
    console.error('❌ Hiç sonuç elde edilemedi.');
    process.exit(1);
  }

  // Aggregate metrics
  const metrics = computeAggregates(scores, consistencyResults);

  // Report
  const reportMd = buildReport(scores, consistencyResults, metrics, startTime, dryRun, categoryFilter, itemFilter);
  const filename = `eval_${now()}.md`;
  const outputPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outputPath, reportMd, 'utf-8');

  // Terminal summary
  console.log('\n' + '─'.repeat(60));
  console.log('📊 SONUÇLAR');
  console.log('─'.repeat(60));
  const fmt = (n: number) => n.toFixed(3);
  console.log(`M1  is_perfume accuracy : ${fmt(metrics.M1)}  ${metrics.M1 >= THRESHOLDS.M1_is_perfume_accuracy.pass ? '✅' : '❌'}`);
  console.log(`M2  brand accuracy      : ${fmt(metrics.M2)}  ${metrics.M2 >= THRESHOLDS.M2_brand_accuracy.pass ? '✅' : '❌'}`);
  console.log(`M3  name fuzzy match    : ${fmt(metrics.M3)}  ${metrics.M3 >= THRESHOLDS.M3_name_fuzzy.pass ? '✅' : '❌'}`);
  console.log(`M4  concentration       : ${fmt(metrics.M4)}  ${metrics.M4 >= THRESHOLDS.M4_concentration.pass ? '✅' : '❌'}`);
  console.log(`M5  gender accuracy     : ${fmt(metrics.M5)}  ${metrics.M5 >= THRESHOLDS.M5_gender_accuracy.pass ? '✅' : '❌'}`);
  console.log(`M6  notes F1            : ${fmt(metrics.M6)}  ${metrics.M6 >= THRESHOLDS.M6_notes_f1.pass ? '✅' : '❌'}`);
  console.log(`M7  molecule precision  : ${fmt(metrics.M7)}  ${metrics.M7 >= THRESHOLDS.M7_molecule_precision.pass ? '✅' : '❌'}`);
  console.log(`M8  molecule recall     : ${fmt(metrics.M8)}  ${metrics.M8 >= THRESHOLDS.M8_molecule_recall.pass ? '✅' : '❌'}`);
  console.log(`M9  Brier score         : ${fmt(metrics.M9)}  ${metrics.M9 <= THRESHOLDS.M9_brier_score.pass ? '✅' : '❌'}`);
  console.log(`M10 consistency Jaccard : ${fmt(metrics.M10)}  ${metrics.M10 >= THRESHOLDS.M10_consistency_jaccard.pass ? '✅' : '❌'}`);
  if (!dryRun) {
    console.log(`M11 latency p95        : ${Math.round(metrics.M11_p95)}ms  ${metrics.M11_p95 <= THRESHOLDS.M11_latency_p95_ms.pass ? '✅' : '❌'}`);
  }
  console.log(`M12 false positive rate : ${fmt(metrics.M12)}  ${metrics.M12 <= THRESHOLDS.M12_false_positive_rate.pass ? '✅' : '❌'}`);
  if (metrics.overConfidentCount > 0) {
    console.log(`⚠️  gold_056 over-confident: ${metrics.overConfidentCount}`);
  }
  console.log('─'.repeat(60));
  console.log(`\n✅ Rapor kaydedildi: ${outputPath}\n`);
}

main().catch(err => {
  console.error('💥 Kritik hata:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
