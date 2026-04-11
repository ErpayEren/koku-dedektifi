import type { AnalysisResult, AnalysisTimeline, MoleculeEvidenceLevel, MoleculeItem, TechnicalItem } from './types';

function cleanText(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  const out = value.trim();
  return out || fallback;
}

function asList(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  value.forEach((item) => {
    const text = cleanText(item);
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(text);
  });
  return out.slice(0, max);
}

function clampScore(value: unknown, fallback = 50): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function parseLongevityHours(value: unknown): AnalysisResult['longevityHours'] {
  if (!value || typeof value !== 'object') return null;
  const entry = value as Record<string, unknown>;
  const min = Number(entry.min);
  const max = Number(entry.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return {
    min: Math.max(0, Math.round(min)),
    max: Math.max(Math.round(min), Math.round(max)),
  };
}

function parseEvidenceLevel(value: unknown): MoleculeEvidenceLevel | undefined {
  if (
    value === 'verified_component' ||
    value === 'signature_molecule' ||
    value === 'accord_component' ||
    value === 'note_match' ||
    value === 'unmatched'
  ) {
    return value;
  }
  if (value === 'official') return 'verified_component';
  if (value === 'validated') return 'signature_molecule';
  if (value === 'mapped') return 'note_match';
  if (value === 'inferred') return 'accord_component';
  return undefined;
}

function normalizeMolecules(value: unknown): MoleculeItem[] {
  if (!Array.isArray(value)) return [];
  const molecules: MoleculeItem[] = [];
  value.forEach((raw) => {
    if (!raw || typeof raw !== 'object') return;
    const entry = raw as Record<string, unknown>;
    const name = cleanText(entry.name);
    if (!name) return;
    molecules.push({
      name,
      smiles: cleanText(entry.smiles),
      formula: cleanText(entry.formula),
      family: cleanText(entry.family),
      origin: cleanText(entry.origin),
      note: cleanText(entry.note),
      contribution: cleanText(entry.contribution),
      effect: cleanText(entry.effect),
      percentage: cleanText(entry.percentage),
      evidence: cleanText(entry.evidence),
      evidenceLevel: parseEvidenceLevel(entry.evidence_level ?? entry.evidenceLevel),
      evidenceLabel: cleanText(entry.evidence_label ?? entry.evidenceLabel),
      evidenceReason: cleanText(entry.evidence_reason ?? entry.evidenceReason),
      matchedNotes: asList(entry.matched_notes ?? entry.matchedNotes, 6),
    });
  });
  return molecules;
}

function normalizeLegacyKeyMolecules(value: unknown): MoleculeItem[] {
  if (!Array.isArray(value)) return [];
  const molecules: MoleculeItem[] = [];
  value.forEach((raw) => {
    if (!raw || typeof raw !== 'object') return;
    const entry = raw as Record<string, unknown>;
    const name = cleanText(entry.name);
    if (!name) return;
    molecules.push({
      name,
      smiles: cleanText(entry.smiles),
      formula: cleanText(entry.formula),
      family: cleanText(entry.family),
      origin: cleanText(entry.origin),
      note: cleanText(entry.role),
      contribution: cleanText(entry.effect ?? entry.contribution),
      effect: cleanText(entry.effect),
      percentage: cleanText(entry.percentage),
      evidence: cleanText(entry.evidence),
      evidenceLevel: parseEvidenceLevel(entry.evidence_level ?? entry.evidenceLevel),
      evidenceLabel: cleanText(entry.evidence_label ?? entry.evidenceLabel),
      evidenceReason: cleanText(entry.evidence_reason ?? entry.evidenceReason),
      matchedNotes: asList(entry.matched_notes ?? entry.matchedNotes, 6),
    });
  });
  return molecules;
}

function extractConfidenceScore(value: unknown): number | undefined {
  if (Number.isFinite(Number(value))) return clampScore(value, 85);
  if (value && typeof value === 'object') {
    const score = Number((value as Record<string, unknown>).score);
    if (Number.isFinite(score)) return clampScore(score, 85);
  }
  return undefined;
}

function normalizeTechnical(value: unknown): TechnicalItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const entry = raw as Record<string, unknown>;
      const label = cleanText(entry.label);
      const val = cleanText(entry.value);
      if (!label || !val) return null;
      const score = Number(entry.score);
      return {
        label,
        value: val,
        score: Number.isFinite(score) ? clampScore(score, 50) : null,
      };
    })
    .filter((item): item is TechnicalItem => Boolean(item));
}

function normalizeTimeline(value: unknown): AnalysisTimeline | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  const t0 = cleanText(entry.t0);
  const t1 = cleanText(entry.t1);
  const t2 = cleanText(entry.t2);
  const t3 = cleanText(entry.t3);
  if (!t0 && !t1 && !t2 && !t3) return null;
  return { t0, t1, t2, t3 };
}

function normalizePyramid(value: unknown, fallbackSource?: Record<string, unknown>): AnalysisResult['pyramid'] {
  const entry = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  const top = asList(entry?.top ?? fallbackSource?.topNotes, 6);
  const middle = asList(entry?.middle ?? entry?.heart ?? fallbackSource?.heartNotes, 8);
  const base = asList(entry?.base ?? fallbackSource?.baseNotes, 8);
  if (top.length === 0 && middle.length === 0 && base.length === 0) return null;
  return { top, middle, base };
}

function normalizeMode(value: unknown): AnalysisResult['analysisMode'] {
  if (value === 'text' || value === 'notes' || value === 'image') return value;
  if (value === 'photo') return 'image';
  return undefined;
}

function normalizePersona(value: unknown, family: string, occasion: string): AnalysisResult['persona'] {
  if (!value || typeof value !== 'object') {
    return {
      gender: 'Unisex',
      age: 'Yetiskin profili',
      vibe: family,
      occasions: occasion ? [occasion] : [],
      season: '',
    };
  }

  const entry = value as Record<string, unknown>;
  const occasions = asList(entry.occasions, 4);
  return {
    gender: cleanText(entry.gender, 'Unisex'),
    age: cleanText(entry.age, 'Yetiskin profili'),
    vibe: cleanText(entry.vibe, family),
    occasions: occasions.length > 0 ? occasions : occasion ? [occasion] : [],
    season: cleanText(entry.season),
  };
}

function normalizeScoreCards(value: unknown, source?: Record<string, unknown>): AnalysisResult['scoreCards'] {
  const entry = value && typeof value === 'object' ? (value as Record<string, unknown>) : source ?? null;
  if (!entry) return null;
  const val = Number(entry.value ?? entry.valueScore);
  const uniq = Number(entry.uniqueness ?? entry.uniquenessScore);
  const wear = Number(entry.wearability ?? entry.wearabilityScore);
  if (!Number.isFinite(val) && !Number.isFinite(uniq) && !Number.isFinite(wear)) return null;
  return {
    value: Number.isFinite(val) ? Math.max(1, Math.min(10, Math.round(val))) : 7,
    uniqueness: Number.isFinite(uniq) ? Math.max(1, Math.min(10, Math.round(uniq))) : 7,
    wearability: Number.isFinite(wear) ? Math.max(1, Math.min(10, Math.round(wear))) : 7,
  };
}

function normalizeDataConfidence(value: unknown): AnalysisResult['dataConfidence'] {
  if (!value || typeof value !== 'object') return undefined;
  const entry = value as Record<string, unknown>;
  const hasDbMatch = Boolean(entry.hasDbMatch ?? entry.has_db_match);
  const sourceRaw = cleanText(entry.source, hasDbMatch ? 'db' : 'ai').toLowerCase();
  const source = sourceRaw === 'db' ? 'db' : 'ai';
  return { hasDbMatch, source };
}

function normalizeSimilarFragrances(value: unknown): NonNullable<AnalysisResult['similarFragrances']> {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const entry = raw as Record<string, unknown>;
      const name = cleanText(entry.name);
      if (!name) return null;
      return {
        name,
        brand: cleanText(entry.brand),
        reason: cleanText(entry.reason),
        priceRange: cleanText(entry.priceRange ?? entry.price_range),
      };
    })
    .filter((item): item is NonNullable<AnalysisResult['similarFragrances']>[number] => Boolean(item));
}

export function hydrateAnalysisResult(value: unknown): AnalysisResult | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const name = cleanText(raw.name, 'Bilinmeyen Koku');
  const family = cleanText(raw.family, 'Aromatik');
  const description = cleanText(raw.description ?? raw.ai_description, `${name} icin detayli aciklama uretildi.`);
  const moodProfile = cleanText(raw.moodProfile ?? raw.mood_profile, description);
  const pyramid = normalizePyramid(raw.pyramid, raw);
  const occasion = cleanText(raw.occasion, asList(raw.occasions, 1)[0] || 'Gunluk');
  const similarFragrances = normalizeSimilarFragrances(raw.similarFragrances ?? raw.similar_fragrances);
  const molecules = (() => {
    const normalized = normalizeMolecules(raw.molecules);
    if (normalized.length > 0) return normalized;
    return normalizeLegacyKeyMolecules(raw.keyMolecules ?? raw.key_molecules);
  })();
  const technical = normalizeTechnical(raw.technical);
  const scoreCards = normalizeScoreCards(raw.scoreCards, raw);
  const season = asList(raw.season ?? raw.seasons, 4);
  const scoresSource = raw.scores && typeof raw.scores === 'object' ? (raw.scores as Record<string, unknown>) : {};
  const similar = (() => {
    const direct = asList(raw.similar, 10);
    if (direct.length > 0) return direct;
    return similarFragrances
      .map((item) => `${item.brand ? `${item.brand} ` : ''}${item.name}`.trim())
      .filter(Boolean)
      .slice(0, 10);
  })();

  return {
    id: cleanText(raw.id, `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
    iconToken: cleanText(raw.iconToken, 'signature'),
    name,
    brand: cleanText(raw.brand) || null,
    year: Number.isFinite(Number(raw.year)) ? Number(raw.year) : null,
    family,
    concentration: cleanText(raw.concentration) || null,
    intensity: clampScore(raw.intensity, 68),
    season,
    occasion,
    occasions: asList(raw.occasions, 8),
    description,
    moodProfile,
    expertComment: cleanText(raw.expertComment ?? raw.expert_comment),
    layeringTip: cleanText(raw.layeringTip ?? raw.layering_tip),
    applicationTip: cleanText(raw.applicationTip ?? raw.application_tip),
    sillage: cleanText(raw.sillage),
    longevityHours: parseLongevityHours(raw.longevityHours ?? raw.longevity_hours),
    ageProfile: cleanText(raw.ageProfile ?? raw.age_profile),
    genderProfile: cleanText(raw.genderProfile ?? raw.gender_profile, 'Unisex'),
    pyramid,
    similar,
    similarFragrances,
    scores: {
      freshness: clampScore(scoresSource.freshness, 50),
      sweetness: clampScore(scoresSource.sweetness, 45),
      warmth: clampScore(scoresSource.warmth, 60),
    },
    scoreCards,
    persona: normalizePersona(raw.persona, family, occasion),
    dupes: asList(raw.dupes, 8),
    layering:
      raw.layering && typeof raw.layering === 'object'
        ? {
            pair: cleanText((raw.layering as Record<string, unknown>).pair),
            result: cleanText((raw.layering as Record<string, unknown>).result),
          }
        : null,
    timeline: normalizeTimeline(raw.timeline),
    technical,
    molecules,
    confidence: extractConfidenceScore(raw.confidence),
    dataConfidence: normalizeDataConfidence(raw.dataConfidence ?? raw.data_confidence),
    analysisMode: normalizeMode(raw.analysisMode ?? raw.mode ?? raw.inputMode ?? raw.input_mode),
    inputText: cleanText(raw.inputText ?? raw.input_text),
    createdAt: cleanText(raw.createdAt ?? raw.created_at, new Date().toISOString()),
  };
}

function parseProxyBlocks(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') {
    throw new Error('Analiz cevabi bos dondu.');
  }
  const payload = data as Record<string, unknown>;
  const raw = Array.isArray(payload.content)
    ? payload.content
        .map((block) => (block && typeof block === 'object' ? cleanText((block as Record<string, unknown>).text) : ''))
        .join('')
    : '';

  if (!raw) {
    throw new Error('Analiz icerigi okunamadi.');
  }
  const start = raw.indexOf('{');
  if (start < 0) {
    throw new Error('Analiz JSON formatinda gelmedi.');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;

  for (let i = start; i < raw.length; i += 1) {
    const char = raw[i];
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
        end = i;
        break;
      }
    }
  }

  const jsonString = end > -1 ? raw.slice(start, end + 1) : raw.slice(start);
  return JSON.parse(jsonString) as Record<string, unknown>;
}

export function normalizeAnalysisPayload(data: unknown): AnalysisResult {
  const raw = parseProxyBlocks(data);
  const now = new Date().toISOString();
  const name = cleanText(raw.name, 'Bilinmeyen Koku');

  const pyramidRaw = raw.pyramid as Record<string, unknown> | null | undefined;
  const pyramidTop = asList(pyramidRaw?.top, 5);
  const pyramidMiddle = asList(pyramidRaw?.middle, 6);
  const pyramidBase = asList(pyramidRaw?.base, 6);
  const hasPyramid = pyramidTop.length > 0 || pyramidMiddle.length > 0 || pyramidBase.length > 0;

  const molecules = normalizeMolecules(raw.molecules);
  const technical = normalizeTechnical(raw.technical);
  const timeline = normalizeTimeline(raw.timeline);
  const confidence = extractConfidenceScore(raw.confidence);

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    iconToken: cleanText(raw.iconToken, 'signature'),
    name,
    family: cleanText(raw.family, 'Aromatik'),
    intensity: clampScore(raw.intensity, 68),
    season: asList(raw.season, 4),
    occasion: cleanText(raw.occasion, 'Gunluk'),
    description: cleanText(raw.description, `${name} icin detayli aciklama uretildi.`),
    pyramid: hasPyramid
      ? {
          top: pyramidTop,
          middle: pyramidMiddle,
          base: pyramidBase,
        }
      : null,
    similar: asList(raw.similar, 8),
    scores: {
      freshness: clampScore((raw.scores as Record<string, unknown> | null | undefined)?.freshness, 50),
      sweetness: clampScore((raw.scores as Record<string, unknown> | null | undefined)?.sweetness, 45),
      warmth: clampScore((raw.scores as Record<string, unknown> | null | undefined)?.warmth, 60),
    },
    persona:
      raw.persona && typeof raw.persona === 'object'
        ? {
            gender: cleanText((raw.persona as Record<string, unknown>).gender, 'Unisex'),
            age: cleanText((raw.persona as Record<string, unknown>).age, 'Yetiskin profili'),
            vibe: cleanText((raw.persona as Record<string, unknown>).vibe, 'Dengeli'),
            occasions: asList((raw.persona as Record<string, unknown>).occasions, 4),
            season: cleanText((raw.persona as Record<string, unknown>).season, ''),
          }
        : null,
    dupes: asList(raw.dupes, 4),
    layering:
      raw.layering && typeof raw.layering === 'object'
        ? {
            pair: cleanText((raw.layering as Record<string, unknown>).pair),
            result: cleanText((raw.layering as Record<string, unknown>).result),
          }
        : null,
    timeline,
    technical,
    molecules,
    confidence,
    dataConfidence: normalizeDataConfidence(raw.dataConfidence ?? raw.data_confidence),
    createdAt: now,
  };
}
