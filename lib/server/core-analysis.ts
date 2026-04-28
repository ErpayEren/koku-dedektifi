import { randomUUID } from 'crypto';
import { getPublicFragranceByName, getPublicFragrances, getPublicMoleculeByName } from '../catalog-public';
import type { PublicFragrance } from '../catalog-public';
import { getSupabase } from '../supabase';
import type {
  AnalysisMode,
  AnalysisResult,
  LongevityHours,
  MoleculeEvidenceLevel,
  MoleculeItem,
  SimilarFragranceItem,
  TechnicalItem,
} from '../client/types';
import { SUPABASE_ANALYSES_TABLE } from './catalog';

type RawObject = Record<string, unknown>;

const FAMILY_LABELS = [
  'Odunsu',
  'Çiçeksi',
  'Oryantal',
  'Aromatik',
  'Fougère',
  'Chypre',
  'Aquatik',
  'Gourmand',
  'Deri',
  'Oud',
] as const;

const CONCENTRATION_LABELS = ['EDT', 'EDP', 'Parfüm', 'Kolanya', 'EDP Intense'] as const;
const GENDER_LABELS = ['Feminen', 'Maskülen', 'Unisex'] as const;
const SILLAGE_LABELS = ['yakın', 'orta', 'güçlü', 'çok güçlü'] as const;
const SEASON_LABELS = ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış'] as const;
const OCCASION_LABELS = ['Günlük', 'İş', 'Akşam', 'Özel', 'Spor', 'Romantik'] as const;

interface PersistedAnalysisRow {
  id: string;
  created_at: string;
  input_type?: string | null;
  input_data?: string | null;
  slug?: string | null;
  is_public?: boolean | null;
  scene_data?: {
    app_user_id?: string | null;
    result_json?: AnalysisResult | null;
    brand?: string | null;
  } | null;
}

function buildAnalysisSlug(brand: string | null | undefined, name: string | null | undefined, id: string): string {
  const base = `${brand ?? ''}-${name ?? 'parfum'}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const hash = id.replace(/-/g, '').slice(0, 6);
  return `${base}-${hash}`;
}

function cleanText(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function asNullableText(value: unknown): string | null {
  const text = cleanText(value);
  return text || null;
}

function normalizeEnum<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number] | null = null): T[number] | null {
  const text = cleanText(value).toLowerCase();
  if (!text) return fallback;
  const hit = allowed.find((item) => item.toLowerCase() === text);
  return hit ?? fallback;
}

function asStringArray(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const output: string[] = [];
  value.forEach((entry) => {
    const text = cleanText(entry);
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    output.push(text);
  });
  return output.slice(0, max);
}

function clampTenScore(value: unknown, fallback = 6): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(10, Math.round(parsed)));
}

function resolveFamily(value: unknown, fallback = 'Aromatik'): string {
  return normalizeEnum(value, FAMILY_LABELS, fallback as (typeof FAMILY_LABELS)[number]) ?? fallback;
}

function resolveConcentration(value: unknown): string | null {
  return normalizeEnum(value, CONCENTRATION_LABELS);
}

function resolveSillage(value: unknown): AnalysisResult['sillage'] {
  return normalizeEnum(value, SILLAGE_LABELS, 'orta') ?? 'orta';
}

function resolveGender(value: unknown): AnalysisResult['genderProfile'] {
  return normalizeEnum(value, GENDER_LABELS, 'Unisex') ?? 'Unisex';
}

function listOrFallback(values: string[], fallback: string[]): string[] {
  return values.length > 0 ? values : fallback;
}

function parseLongevityHours(value: unknown): LongevityHours | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as RawObject;
  const min = Number(row.min);
  const max = Number(row.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return {
    min: Math.max(0, Math.round(min)),
    max: Math.max(Math.round(min), Math.round(max)),
  };
}

function estimateIntensity(sillage: AnalysisResult['sillage'], longevity: LongevityHours | null, concentration: string | null): number {
  const sillageBase =
    sillage === 'çok güçlü' ? 90 : sillage === 'güçlü' ? 78 : sillage === 'orta' ? 62 : 42;
  const longevityBoost = longevity ? Math.min(16, Math.max(0, longevity.max - longevity.min + longevity.max) * 1.4) : 0;
  const concentrationBoost =
    concentration === 'Parfüm' ? 10 : concentration === 'EDP Intense' ? 8 : concentration === 'EDP' ? 5 : concentration === 'EDT' ? 2 : 0;
  return Math.max(18, Math.min(96, Math.round(sillageBase + longevityBoost + concentrationBoost)));
}

function inferWheelScores(family: string, notes: { top: string[]; heart: string[]; base: string[] }): AnalysisResult['scores'] {
  const allNotes = [...notes.top, ...notes.heart, ...notes.base].join(' ').toLowerCase();
  const freshness = /(bergamot|citrus|limon|lemon|mandarin|aquatic|marine|fresh|mint|grapefruit)/.test(allNotes)
    ? 78
    : family === 'Aquatik'
      ? 82
      : 48;
  const sweetness = /(vanilla|caramel|tonka|sweet|şeker|sugar|praline|honey|amber)/.test(allNotes)
    ? 68
    : family === 'Gourmand'
      ? 78
      : 34;
  const warmth = /(amber|oud|leather|vanilla|patchouli|saffron|wood|sedir|cedar|rum)/.test(allNotes)
    ? 72
    : family === 'Odunsu' || family === 'Oryantal' || family === 'Oud'
      ? 76
      : 42;

  return { freshness, sweetness, warmth };
}

function buildTimeline(notes: { top: string[]; heart: string[]; base: string[] }): AnalysisResult['timeline'] {
  const top = notes.top[0] || 'İlk açılış';
  const heart = notes.heart[0] || notes.top[1] || 'Kalp notası';
  const base = notes.base[0] || notes.heart[1] || 'Dip nota';

  return {
    t0: `${top} ilk temasta öne çıkar; koku henüz tenle yeni buluşurken ilk izlenimi belirler.`,
    t1: `${notes.heart.length > 0 ? notes.heart.join(', ') : heart} açılımın ana karakterini kurar ve kompozisyonu dengeler.`,
    t2: `${notes.base.length > 0 ? notes.base.join(', ') : base} koku oturdukça derinlik kazandırır ve imzayı taşır.`,
    t3: `${base} kuru izde daha sakin ama kalıcı bir hat bırakarak kompozisyonu kapatır.`,
  };
}

function sentenceTrim(value: string, maxSentences: number): string {
  const sentences = value
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (sentences.length <= maxSentences) return value.trim();
  return `${sentences.slice(0, maxSentences).join(' ')} ... [Pro ile devamını oku]`;
}

function resolveEvidenceMeta(level: MoleculeEvidenceLevel): { label: string; reason: string } {
  switch (level) {
    case 'verified_component':
      return { label: 'Doğrulanmış Bileşen', reason: 'Katalog verisiyle destekleniyor.' };
    case 'signature_molecule':
      return { label: 'İmza Molekül', reason: 'Bu profilin ayırt edici moleküler izi.' };
    case 'accord_component':
      return { label: 'Muhtemel Akor Bileşeni', reason: 'Birden çok nota sinyali aynı akoru işaret ediyor.' };
    case 'note_match':
      return { label: 'Nota Eşleşmesi', reason: 'Nota eşleşmesiyle destekleniyor.' };
    default:
      return { label: 'Henüz Eşleşmedi', reason: 'Bu molekül için savunulabilir bir bağ kurulamadı.' };
  }
}

function normalizeMoleculeLevel(level: unknown, matchedFragrance: PublicFragrance | null, moleculeName: string): MoleculeEvidenceLevel {
  const text = cleanText(level).toLowerCase();
  // Low-confidence levels from AI are kept as-is
  if (text === 'note_match' || text === 'unmatched') return text;
  // verified_component / signature_molecule are only authoritative from the catalog;
  // cap AI-claimed higher levels to accord_component to prevent hallucinated FPs
  if (matchedFragrance) {
    const exact = matchedFragrance.key_molecules.find(
      (entry) => entry.name.trim().toLowerCase() === moleculeName.trim().toLowerCase(),
    );
    if (exact?.evidence_level) return exact.evidence_level;
  }
  return 'accord_component';
}

function buildMoleculeItems(
  rawItems: unknown,
  matchedFragrance: PublicFragrance | null,
  isPro: boolean,
): MoleculeItem[] {
  const items = Array.isArray(rawItems) ? rawItems : [];
  const output: MoleculeItem[] = [];

  items.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') return;
    const row = entry as RawObject;
    const name = cleanText(row.name);
    if (!name) return;

    const publicMolecule = getPublicMoleculeByName(name);
    const evidenceLevel = normalizeMoleculeLevel(row.evidenceLevel ?? row.evidence_level, matchedFragrance, name);
    const evidence = resolveEvidenceMeta(evidenceLevel);

    output.push({
      name,
      smiles: cleanText(row.smiles) || publicMolecule?.smiles || '',
      formula: cleanText(row.formula) || publicMolecule?.iupac_name || '',
      family: cleanText(row.family) || publicMolecule?.families?.join(' · ') || '',
      origin: cleanText(row.origin) || publicMolecule?.natural_source || '',
      note: cleanText(row.note) || cleanText(row.role) || publicMolecule?.longevity_contribution || '',
      contribution: cleanText(row.effect) || cleanText(row.contribution) || evidence.reason,
      effect: cleanText(row.effect),
      percentage:
        !isPro && index > 0
          ? 'Pro ile görüntüle'
          : cleanText(row.percentage) ||
            (typeof row.percentage === 'number' ? `${row.percentage}%` : '') ||
            (publicMolecule?.usage_percentage_typical ? `${Math.round(publicMolecule.usage_percentage_typical)}%` : ''),
      evidenceLevel,
      evidenceLabel: evidence.label,
      evidenceReason: evidence.reason,
      matchedNotes: asStringArray(row.matchedNotes ?? row.matched_notes, 4),
    });
  });

  // Merge DB verified/signature molecules: upgrade evidence level if already present, else append
  if (matchedFragrance) {
    matchedFragrance.key_molecules.forEach((entry) => {
      if (entry.evidence_level !== 'verified_component' && entry.evidence_level !== 'signature_molecule') return;
      const existingIdx = output.findIndex(
        (o) => o.name.trim().toLowerCase() === entry.name.trim().toLowerCase(),
      );
      const evidence = resolveEvidenceMeta(entry.evidence_level);
      if (existingIdx >= 0) {
        output[existingIdx] = {
          ...output[existingIdx]!,
          evidenceLevel: entry.evidence_level,
          evidenceLabel: evidence.label,
          evidenceReason: entry.evidence_reason || evidence.reason,
          matchedNotes: entry.matched_notes || output[existingIdx]!.matchedNotes,
        };
      } else {
        const idx = output.length;
        const publicMolecule = getPublicMoleculeByName(entry.name);
        output.push({
          name: entry.name,
          smiles: publicMolecule?.smiles || entry.smiles || '',
          formula: publicMolecule?.iupac_name || '',
          family: publicMolecule?.families?.join(' · ') || '',
          origin: publicMolecule?.natural_source || '',
          note: entry.role,
          contribution: `Bu molekül ${matchedFragrance.name} profilinin ${entry.role} katmanını destekler.`,
          effect: `Kompozisyonun ${entry.role} akorunu taşır.`,
          percentage: !isPro && idx > 0 ? 'Pro ile görüntüle' : `${Math.round(entry.percentage)}%`,
          evidenceLevel: entry.evidence_level,
          evidenceLabel: evidence.label,
          evidenceReason: entry.evidence_reason || evidence.reason,
          matchedNotes: entry.matched_notes || [],
        });
      }
    });
  }

  if (output.length > 0) return output;
  if (!matchedFragrance) return [];

  return matchedFragrance.key_molecules.map((entry, index) => {
    const publicMolecule = getPublicMoleculeByName(entry.name);
    const evidence = resolveEvidenceMeta(entry.evidence_level);
    return {
      name: entry.name,
      smiles: publicMolecule?.smiles || entry.smiles || '',
      formula: publicMolecule?.iupac_name || '',
      family: publicMolecule?.families?.join(' · ') || '',
      origin: publicMolecule?.natural_source || '',
      note: entry.role,
      contribution: `Bu molekül ${matchedFragrance.name} profilinin ${entry.role} katmanını destekler.`,
      effect: `Kompozisyonun ${entry.role} akorunu taşır.`,
      percentage: !isPro && index > 0 ? 'Pro ile görüntüle' : `${Math.round(entry.percentage)}%`,
      evidenceLevel: entry.evidence_level,
      evidenceLabel: evidence.label,
      evidenceReason: entry.evidence_reason || evidence.reason,
      matchedNotes: entry.matched_notes || [],
    };
  });
}

function normalizeSimilarFragrances(rawItems: unknown, matchedFragrance: PublicFragrance | null): SimilarFragranceItem[] {
  const output: SimilarFragranceItem[] = [];

  if (Array.isArray(rawItems)) {
    rawItems.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      const row = entry as RawObject;
      const name = cleanText(row.name);
      const brand = cleanText(row.brand);
      if (!name) return;
      output.push({
        name,
        brand,
        reason: cleanText(row.reason, 'Benzer aile ve nota omurgası.'),
        priceRange: cleanText(row.priceRange ?? row.price_range, 'Fiyat bandı yok'),
      });
    });
  }

  if (output.length > 0) return output.slice(0, 10);
  if (!matchedFragrance || matchedFragrance.similar_fragrances.length === 0) return [];

  const fragranceById = new Map(getPublicFragrances().map((item) => [item.id, item]));
  return matchedFragrance.similar_fragrances
    .map((id) => fragranceById.get(id))
    .filter((item): item is PublicFragrance => Boolean(item))
    .slice(0, 10)
    .map((item) => ({
      name: item.name,
      brand: item.brand || '',
      reason: `${matchedFragrance.character_tags?.[0] || 'Benzer'} karakterinde yakın bir profil sunar.`,
      priceRange: item.price_tier || 'Fiyat bandı yok',
    }));
}

function buildTechnicalItems(
  concentration: string | null,
  sillage: AnalysisResult['sillage'],
  longevity: LongevityHours | null,
  scores: AnalysisResult['scoreCards'],
): TechnicalItem[] {
  const projectionScore = sillage === 'çok güçlü' ? 92 : sillage === 'güçlü' ? 78 : sillage === 'orta' ? 60 : 40;
  const longevityScore = longevity ? Math.max(20, Math.min(100, Math.round(((longevity.min + longevity.max) / 2) * 10))) : 60;

  const items: TechnicalItem[] = [
    { label: 'Konsantrasyon', value: concentration || 'Belirtilmedi', score: null },
    { label: 'Yayılım', value: sillage || 'orta', score: projectionScore },
    {
      label: 'Kalıcılık',
      value: longevity ? `${longevity.min}-${longevity.max} saat` : 'Belirtilmedi',
      score: longevityScore,
    },
  ];

  if (scores) {
    items.push({ label: 'Değer', value: `${scores.value}/10`, score: scores.value * 10 });
    items.push({ label: 'Özgünlük', value: `${scores.uniqueness}/10`, score: scores.uniqueness * 10 });
    items.push({ label: 'Giyilebilirlik', value: `${scores.wearability}/10`, score: scores.wearability * 10 });
  }

  return items;
}

function familyToIconToken(family: string): string {
  const text = family.toLowerCase();
  if (text.includes('çiçek')) return 'floral';
  if (text.includes('odun')) return 'woody';
  if (text.includes('oryantal') || text.includes('oud') || text.includes('amber')) return 'amber';
  if (text.includes('aquatik')) return 'aquatic';
  if (text.includes('gourmand')) return 'gourmand';
  if (text.includes('aromatik') || text.includes('foug')) return 'signature';
  return 'signature';
}

function truncateForFree(result: AnalysisResult): AnalysisResult {
  const expertComment = cleanText(result.expertComment);

  return {
    ...result,
    molecules: result.molecules.map((item, index) =>
      index === 0
        ? item
        : {
            ...item,
            percentage: 'Pro ile görüntüle',
          },
    ),
    similar: (result.similar || []).slice(0, 3),
    similarFragrances: (result.similarFragrances || []).slice(0, 3),
    expertComment: expertComment ? sentenceTrim(expertComment, 2) : expertComment,
    layeringTip: 'Pro ile görüntüle',
    applicationTip: 'Pro ile görüntüle',
    scoreCards: null,
  };
}

function toReplaySafeText(value: string | null | undefined, fallback = ''): string {
  const text = cleanText(value);
  return text || fallback;
}

function normalizeOccasionList(rawItems: unknown, fallbackOccasion: string): string[] {
  const items = asStringArray(rawItems, 8)
    .map((item) => normalizeEnum(item, OCCASION_LABELS, item as (typeof OCCASION_LABELS)[number]) ?? item)
    .filter(Boolean);
  return items.length > 0 ? items : (fallbackOccasion ? [fallbackOccasion] : []);
}

export function buildAnalysisResponseSchema(): RawObject {
  return {
    type: 'object',
    properties: {
      name: { type: 'string' },
      brand: { type: ['string', 'null'] },
      year: { type: ['integer', 'null'] },
      family: { type: 'string', enum: [...FAMILY_LABELS] },
      concentration: { type: ['string', 'null'], enum: [...CONCENTRATION_LABELS, null] },
      topNotes: { type: 'array', items: { type: 'string' } },
      heartNotes: { type: 'array', items: { type: 'string' } },
      baseNotes: { type: 'array', items: { type: 'string' } },
      keyMolecules: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            effect: { type: 'string', maxLength: 80 },
            percentage: { type: 'string' },
          },
          required: ['name', 'effect', 'percentage'],
        },
      },
      sillage: { type: 'string', enum: [...SILLAGE_LABELS] },
      longevityHours: {
        type: ['object', 'null'],
        properties: {
          min: { type: 'integer' },
          max: { type: 'integer' },
        },
        required: ['min', 'max'],
      },
      seasons: { type: 'array', items: { type: 'string', enum: [...SEASON_LABELS] } },
      occasions: { type: 'array', items: { type: 'string', enum: [...OCCASION_LABELS] } },
      ageProfile: { type: ['string', 'null'] },
      genderProfile: { type: 'string', enum: [...GENDER_LABELS] },
      moodProfile: { type: 'string', maxLength: 250 },
      expertComment: { type: 'string', maxLength: 350 },
      layeringTip: { type: 'string', maxLength: 200 },
      applicationTip: { type: 'string', maxLength: 200 },
      similarFragrances: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            brand: { type: 'string' },
            reason: { type: 'string', maxLength: 100 },
            priceRange: { type: 'string' },
          },
          required: ['name', 'brand', 'reason', 'priceRange'],
        },
      },
      confidenceScore: { type: 'integer', minimum: 0, maximum: 100 },
      valueScore: { type: 'integer' },
      uniquenessScore: { type: 'integer' },
      wearabilityScore: { type: 'integer' },
    },
    required: [
      'name',
      'family',
      'topNotes',
      'heartNotes',
      'baseNotes',
      'keyMolecules',
      'sillage',
      'seasons',
      'occasions',
      'genderProfile',
      'moodProfile',
      'expertComment',
      'layeringTip',
      'applicationTip',
      'similarFragrances',
      'valueScore',
      'uniquenessScore',
      'wearabilityScore',
    ],
  };
}

export function buildAnalysisSystemPrompt(isPro: boolean): string {
  const base = `Sen dünyanın en deneyimli parfüm uzmanı ve GC-MS analistinden oluşan bir zekâsın.
Verilen parfüm adı, koku tanımı, nota listesi veya görsel için aşağıdaki JSON formatında ve yalnızca JSON olarak yanıt ver.
Başka hiçbir şey yazma, açıklama yapma.

Kurallar:
- Bilmediğin veriyi uydurma; emin değilsen null bırak.
- Türkçe yaz.
- family yalnızca şu seçeneklerden biri olsun: ${FAMILY_LABELS.join(' | ')}.
- concentration yalnızca şu seçeneklerden biri olsun: ${CONCENTRATION_LABELS.join(' | ')} ya da null.
- sillage yalnızca şu seçeneklerden biri olsun: ${SILLAGE_LABELS.join(' | ')}.
- seasons yalnızca şu seçeneklerden seçilsin: ${SEASON_LABELS.join(' | ')}.
- occasions yalnızca şu seçeneklerden seçilsin: ${OCCASION_LABELS.join(' | ')}.
- genderProfile yalnızca ${GENDER_LABELS.join(' | ')} olsun.
- moodProfile 2-3 cümlelik şiirsel ama net Türkçe bir profil olsun.
- expertComment parfümör bakış açısıyla derinlemesine Türkçe analiz olsun.
- keyMolecules alanında gerçek molekül adları kullan.
- Benzer parfüm önerilerinde marka ve ürünleri ayrı alanlara yerleştir.
`;

  if (isPro) {
    return `${base}
JSON şeması:
{
  "name": "string",
  "brand": "string | null",
  "year": "number | null",
  "family": "${FAMILY_LABELS.join(' | ')}",
  "concentration": "${CONCENTRATION_LABELS.join(' | ')} | null",
  "topNotes": ["string"],
  "heartNotes": ["string"],
  "baseNotes": ["string"],
  "keyMolecules": [{ "name": "string", "effect": "string", "percentage": "string" }],
  "sillage": "${SILLAGE_LABELS.join(' | ')}",
  "longevityHours": { "min": number, "max": number },
  "seasons": ["${SEASON_LABELS.join('" | "') }"],
  "occasions": ["${OCCASION_LABELS.join('" | "') }"],
  "ageProfile": "string | null",
  "genderProfile": "${GENDER_LABELS.join(' | ')}",
  "moodProfile": "string",
  "expertComment": "string",
  "layeringTip": "string",
  "applicationTip": "string",
  "similarFragrances": [{ "name": "string", "brand": "string", "reason": "string", "priceRange": "string" }],
  "valueScore": number,
  "uniquenessScore": number,
  "wearabilityScore": number
}`;
  }

  return `${base}
Ücretsiz katman kuralları:
- keyMolecules alanında en az 3 molekül üret; ama ilk molekül dışında percentage değerini "Pro ile görüntüle" yaz.
- similarFragrances alanında 6 öneriye kadar üretebilirsin; ilk 3 daha güçlü olsun.
- expertComment ilk 2 cümlede öz olsun; devamı daha yoğun olabilir.
- layeringTip ve applicationTip bilgisi faydalı kalsın ama kullanıcı tarafında gerektiğinde Pro olarak sınırlandırılabilir.

JSON şeması Pro ile aynıdır.`;
}

export function extractJsonObject(rawValue: unknown): RawObject {
  if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue) && 'name' in rawValue) {
    return rawValue as RawObject;
  }

  const payload = rawValue as RawObject | null;
  const rawText = Array.isArray(payload?.content)
    ? payload.content
        .map((entry) => (entry && typeof entry === 'object' ? cleanText((entry as RawObject).text) : ''))
        .join('')
    : cleanText(payload?.text);

  if (!rawText) {
    throw new Error('AI cevabı boş döndü.');
  }

  const start = rawText.indexOf('{');
  if (start < 0) {
    throw new Error('AI cevabı JSON formatında gelmedi.');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;

  for (let index = start; index < rawText.length; index += 1) {
    const char = rawText[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        end = index;
        break;
      }
    }
  }

  const jsonString = end > -1 ? rawText.slice(start, end + 1) : rawText.slice(start);
  return JSON.parse(jsonString) as RawObject;
}

function buildCatalogFallback(rawName: string, rawBrand: string | null): PublicFragrance | null {
  const name = cleanText(rawName);
  const brand = cleanText(rawBrand);
  if (brand && name) {
    return getPublicFragranceByName(`${brand} ${name}`) || getPublicFragranceByName(name);
  }
  return getPublicFragranceByName(name);
}

export function normalizeAiAnalysisToResult(input: {
  payload: RawObject;
  mode: AnalysisMode;
  inputText: string;
  isPro: boolean;
}): AnalysisResult {
  const matchedFragrance = buildCatalogFallback(asNullableText(input.payload.name) || '', asNullableText(input.payload.brand));

  const name = cleanText(input.payload.name, matchedFragrance?.name || 'Bilinmeyen Koku');
  const brand =
    asNullableText(input.payload.brand) ??
    matchedFragrance?.brand ??
    asNullableText(input.payload.similarFragrances?.[0]?.brand) ??
    null;
  const year = Number.isFinite(Number(input.payload.year)) ? Number(input.payload.year) : matchedFragrance?.year ?? null;
  const family = resolveFamily(input.payload.family, matchedFragrance?.gender_profile ? 'Aromatik' : 'Aromatik');
  const concentration = resolveConcentration(input.payload.concentration) ?? matchedFragrance?.concentration ?? null;
  const topNotes = listOrFallback(asStringArray(input.payload.topNotes, 8), matchedFragrance?.top_notes ?? []);
  const heartNotes = listOrFallback(asStringArray(input.payload.heartNotes, 10), matchedFragrance?.heart_notes ?? []);
  const baseNotes = listOrFallback(asStringArray(input.payload.baseNotes, 10), matchedFragrance?.base_notes ?? []);
  const sillage = resolveSillage(input.payload.sillage);
  const longevityHours = parseLongevityHours(input.payload.longevityHours) ?? (matchedFragrance?.longevity_score
    ? { min: Math.max(1, matchedFragrance.longevity_score - 2), max: matchedFragrance.longevity_score + 1 }
    : null);
  const season = listOrFallback(
    asStringArray(input.payload.seasons, 4).map((item) => normalizeEnum(item, SEASON_LABELS, item as (typeof SEASON_LABELS)[number]) ?? item),
    matchedFragrance?.seasons ?? [],
  );
  const occasionList = normalizeOccasionList(input.payload.occasions, matchedFragrance?.occasions?.[0] || '');
  const occasion = occasionList[0] || matchedFragrance?.occasions?.[0] || 'Günlük';
  const moodProfile = cleanText(input.payload.moodProfile);
  const expertComment = cleanText(input.payload.expertComment);
  const layeringTip = cleanText(input.payload.layeringTip);
  const applicationTip = cleanText(input.payload.applicationTip);
  const ageProfile = cleanText(input.payload.ageProfile);
  const genderProfile = resolveGender(input.payload.genderProfile);
  const scoreCards = {
    value: clampTenScore(input.payload.valueScore, 7),
    uniqueness: clampTenScore(input.payload.uniquenessScore, 7),
    wearability: clampTenScore(input.payload.wearabilityScore, 7),
  };
  const noteGroups = {
    top: topNotes,
    heart: heartNotes,
    base: baseNotes,
  };
  const pyramid = {
    top: topNotes,
    middle: heartNotes,
    base: baseNotes,
  };
  const intensity = estimateIntensity(sillage, longevityHours, concentration);
  const scores = inferWheelScores(family, noteGroups);
  const similarFragrances = normalizeSimilarFragrances(input.payload.similarFragrances, matchedFragrance);
  const molecules = buildMoleculeItems(input.payload.keyMolecules, matchedFragrance, input.isPro);

  const result: AnalysisResult = {
    id: randomUUID(),
    iconToken: familyToIconToken(family),
    name,
    brand,
    year,
    family,
    concentration,
    intensity,
    season,
    occasion,
    occasions: occasionList,
    description: moodProfile || `${name} için şiirsel koku profili oluşturuldu.`,
    moodProfile,
    expertComment,
    layeringTip,
    applicationTip,
    sillage,
    longevityHours,
    ageProfile,
    genderProfile,
    pyramid,
    similar: similarFragrances.map((item) => `${item.brand ? `${item.brand} ` : ''}${item.name}`.trim()),
    similarFragrances,
    scores,
    scoreCards,
    persona: {
      gender: genderProfile || 'Unisex',
      age: ageProfile || 'Geniş kullanım',
      vibe: toReplaySafeText(moodProfile.split(/[.!?]/)[0], family),
      occasions: occasionList,
      season: season[0] || '',
    },
    dupes: similarFragrances.slice(0, 3).map((item) => `${item.brand} – ${item.name}`.replace(/^ – /, '')),
    layering: layeringTip
      ? {
          pair: similarFragrances[0] ? `${similarFragrances[0].brand} ${similarFragrances[0].name}`.trim() : 'Kişisel katman önerisi',
          result: layeringTip,
        }
      : null,
    timeline: buildTimeline(noteGroups),
    technical: buildTechnicalItems(concentration, sillage, longevityHours, scoreCards),
    molecules,
    confidence: undefined,
    llmConfidenceScore: Number.isFinite(Number(input.payload.confidenceScore)) ? Number(input.payload.confidenceScore) : undefined,
    dataConfidence: {
      hasDbMatch: Boolean(matchedFragrance),
      source: matchedFragrance ? 'db' : 'ai',
    },
    analysisMode: input.mode,
    inputText: input.inputText,
    createdAt: new Date().toISOString(),
  };

  return input.isPro ? result : truncateForFree(result);
}

function buildAnalysisInsertPayload(params: {
  analysis: AnalysisResult;
  mode: AnalysisMode;
  inputText: string;
  appUserId: string | null;
}): RawObject {
  const matchedFragrance = getPublicFragranceByName(
    `${params.analysis.brand ? `${params.analysis.brand} ` : ''}${params.analysis.name}`.trim(),
  );
  const projectionScore = params.analysis.technical.find((item) => item.label === 'Yayılım')?.score ?? null;
  const longevityScore = params.analysis.technical.find((item) => item.label === 'Kalıcılık')?.score ?? null;

  return {
    input_type: params.mode,
    input_data: params.inputText,
    detected_fragrance_id: matchedFragrance?.id ?? null,
    confidence_score: null,
    iz_score: longevityScore,
    ai_description: params.analysis.expertComment || params.analysis.description,
    scene_data: {
      app_user_id: params.appUserId,
      result_json: params.analysis,
      mood_profile: params.analysis.moodProfile,
      brand: params.analysis.brand,
      year: params.analysis.year,
      season: params.analysis.season,
      occasions: params.analysis.occasions,
    },
    signature_signals: {
      projection: projectionScore,
      longevity: longevityScore,
      value: params.analysis.scoreCards?.value ?? null,
      uniqueness: params.analysis.scoreCards?.uniqueness ?? null,
      wearability: params.analysis.scoreCards?.wearability ?? null,
      sillage: params.analysis.sillage,
    },
    user_fit_score: params.analysis.scoreCards?.wearability ? params.analysis.scoreCards.wearability * 10 : null,
  };
}

export async function persistAnalysisRecord(params: {
  analysis: AnalysisResult;
  mode: AnalysisMode;
  inputText: string;
  appUserId: string | null;
}): Promise<{ id: string; slug?: string; createdAt: string } | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const payload = buildAnalysisInsertPayload(params);
  const { data, error } = await supabase
    .from(SUPABASE_ANALYSES_TABLE)
    .insert(payload)
    .select('id, created_at')
    .maybeSingle();

  if (error || !data) {
    console.error('[analysis] persist failed:', error);
    return null;
  }

  const row = data as PersistedAnalysisRow;
  const slug = buildAnalysisSlug(params.analysis.brand, params.analysis.name, row.id);

  // Write slug back — non-blocking, best-effort
  supabase
    .from(SUPABASE_ANALYSES_TABLE)
    .update({ slug, is_public: true })
    .eq('id', row.id)
    .then(({ error: slugError }) => {
      if (slugError) console.error('[analysis] slug update failed:', slugError);
    });

  return {
    id: String(row.id || ''),
    slug,
    createdAt: String(row.created_at || params.analysis.createdAt),
  };
}

function extractStoredResult(row: PersistedAnalysisRow): AnalysisResult | null {
  const stored = row.scene_data?.result_json;
  if (!stored || typeof stored !== 'object') return null;
  return {
    ...stored,
    id: cleanText(stored.id) || row.id,
    createdAt: cleanText(stored.createdAt) || row.created_at || new Date().toISOString(),
  } as AnalysisResult;
}

export async function listAnalysesForUser(appUserId: string): Promise<AnalysisResult[]> {
  const supabase = getSupabase();
  if (!supabase || !cleanText(appUserId)) return [];

  const { data, error } = await supabase
    .from(SUPABASE_ANALYSES_TABLE)
    .select('id, created_at, scene_data')
    .contains('scene_data', { app_user_id: appUserId })
    .order('created_at', { ascending: false });

  if (error || !Array.isArray(data)) {
    console.error('[analysis] list failed:', error);
    return [];
  }

  return data
    .map((row) => extractStoredResult(row as PersistedAnalysisRow))
    .filter((item): item is AnalysisResult => Boolean(item));
}

export async function getAnalysisById(id: string): Promise<AnalysisResult | null> {
  const supabase = getSupabase();
  if (!supabase || !cleanText(id)) return null;

  const { data, error } = await supabase
    .from(SUPABASE_ANALYSES_TABLE)
    .select('id, created_at, scene_data, slug, is_public')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[analysis] get by id failed:', error);
    return null;
  }

  return extractStoredResult(data as PersistedAnalysisRow);
}

export async function getAnalysisBySlug(slug: string): Promise<AnalysisResult | null> {
  const supabase = getSupabase();
  const cleanSlug = cleanText(slug);
  if (!supabase || !cleanSlug) return null;

  const { data, error } = await supabase
    .from(SUPABASE_ANALYSES_TABLE)
    .select('id, created_at, scene_data, slug, is_public')
    .eq('slug', cleanSlug)
    .eq('is_public', true)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[analysis] get by slug failed:', error);
    return null;
  }

  return extractStoredResult(data as PersistedAnalysisRow);
}

export async function searchPerfumes(params: {
  q?: string;
  gender?: string;
  season?: string;
  brand?: string;
  priceTier?: string;
  page?: number;
  limit?: number;
}): Promise<{ results: Array<Record<string, unknown>>; total: number }> {
  const supabase = getSupabase();
  if (!supabase) return { results: [], total: 0 };

  const pageSize = Math.min(params.limit ?? 24, 48);
  const offset = ((params.page ?? 1) - 1) * pageSize;

  let query = supabase
    .from('perfumes')
    .select('id, name, brand, gender, rating, top_notes, heart_notes, base_notes, cover_image_url, price_tier, popularity_score', { count: 'exact' })
    .order('popularity_score', { ascending: false })
    .order('rating', { ascending: false, nullsFirst: false })
    .range(offset, offset + pageSize - 1);

  if (params.q?.trim()) {
    query = query.textSearch('name', params.q.trim(), { type: 'websearch', config: 'simple' });
  }
  if (params.gender) query = query.eq('gender', params.gender);
  if (params.brand) query = query.ilike('brand', `%${params.brand}%`);
  if (params.priceTier) query = query.eq('price_tier', params.priceTier);

  const { data, error, count } = await query;
  if (error) {
    console.error('[search] perfumes failed:', error);
    return { results: [], total: 0 };
  }

  return { results: (data ?? []) as Array<Record<string, unknown>>, total: count ?? 0 };
}

export async function getTrendingPerfumes(): Promise<Array<Record<string, unknown>>> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('trending_perfumes')
    .select('*')
    .order('analysis_count_7d', { ascending: false })
    .limit(20);

  if (error) {
    // trending_perfumes view may not exist yet — fall back to recent perfumes
    const { data: fallback } = await supabase
      .from('perfumes')
      .select('id, name, brand, gender, rating, top_notes, cover_image_url, price_tier')
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(20);
    return (fallback ?? []) as Array<Record<string, unknown>>;
  }

  return (data ?? []) as Array<Record<string, unknown>>;
}
