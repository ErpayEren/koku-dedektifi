import type { AnalysisResult, MoleculeItem, TechnicalItem } from './types';

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

function normalizeMolecules(value: unknown): MoleculeItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const entry = raw as Record<string, unknown>;
      const name = cleanText(entry.name);
      if (!name) return null;
      return {
        name,
        smiles: cleanText(entry.smiles),
        formula: cleanText(entry.formula),
        family: cleanText(entry.family),
        origin: cleanText(entry.origin),
        note: cleanText(entry.note),
        contribution: cleanText(entry.contribution),
      };
    })
    .filter((item): item is MoleculeItem => Boolean(item));
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

function parseProxyBlocks(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') {
    throw new Error('Analiz cevabı boş döndü.');
  }
  const payload = data as Record<string, unknown>;
  const raw = Array.isArray(payload.content)
    ? payload.content
      .map((block) => ((block && typeof block === 'object') ? cleanText((block as Record<string, unknown>).text) : ''))
      .join('')
    : '';

  if (!raw) {
    throw new Error('Analiz içeriği okunamadı.');
  }
  const start = raw.indexOf('{');
  if (start < 0) {
    throw new Error('Analiz JSON formatında gelmedi.');
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

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    iconToken: cleanText(raw.iconToken, 'signature'),
    name,
    family: cleanText(raw.family, 'Aromatik'),
    intensity: clampScore(raw.intensity, 68),
    season: asList(raw.season, 4),
    occasion: cleanText(raw.occasion, 'Günlük'),
    description: cleanText(raw.description, `${name} için detaylı açıklama üretildi.`),
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
    persona: raw.persona && typeof raw.persona === 'object'
      ? {
        gender: cleanText((raw.persona as Record<string, unknown>).gender, 'Unisex'),
        age: cleanText((raw.persona as Record<string, unknown>).age, 'Yetişkin profili'),
        vibe: cleanText((raw.persona as Record<string, unknown>).vibe, 'Dengeli'),
        occasions: asList((raw.persona as Record<string, unknown>).occasions, 4),
        season: cleanText((raw.persona as Record<string, unknown>).season, ''),
      }
      : null,
    dupes: asList(raw.dupes, 4),
    layering: raw.layering && typeof raw.layering === 'object'
      ? {
        pair: cleanText((raw.layering as Record<string, unknown>).pair),
        result: cleanText((raw.layering as Record<string, unknown>).result),
      }
      : null,
    technical,
    molecules,
    createdAt: now,
  };
}
