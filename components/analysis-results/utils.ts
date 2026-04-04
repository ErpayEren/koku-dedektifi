'use client';

import { getPublicFragranceByName, getPublicMoleculeByName } from '@/lib/catalog-public';
import type { AnalysisResult, MoleculeItem, TechnicalItem } from '@/lib/client/types';
import type { OnboardingPreferences } from '@/lib/client/types';
import type { MoleculeData } from '@/components/MoleculeCard';

export interface SimilarItem {
  name: string;
  similarity: number;
}

export interface MoleculeLookupRow {
  smiles?: string | null;
  formula?: string;
  family?: string;
  origin?: string;
}

type MoleculeEvidenceLevel = MoleculeItem['evidenceLevel'];

export const MOLECULE_ACCENTS = ['#d8b06d', '#a78bfa', '#2dd4bf', '#d58ebb', '#7ecfe5'] as const;

export const FAMILY_GLOW: Record<string, string> = {
  'Aromatik Fougere': 'rgba(126,184,164,.08)',
  Oryantal: 'rgba(201,169,110,.1)',
  Floral: 'rgba(200,140,180,.08)',
  Fresh: 'rgba(90,180,200,.08)',
  Woody: 'rgba(160,130,100,.08)',
  Chypre: 'rgba(126,184,164,.08)',
};

export const ANALYSIS_STEPS = [
  'Koku profili çözümleniyor...',
  'Nota piramidi kuruluyor...',
  'Moleküler izler eşleştiriliyor...',
  'Benzer profiller taranıyor...',
] as const;

export const WHEEL_AXES = [
  { label: 'Tazelik', short: 'F', color: 'var(--sage)' },
  { label: 'Tatlılık', short: 'T', color: '#d58ebb' },
  { label: 'Sıcaklık', short: 'S', color: 'var(--gold)' },
  { label: 'Yoğunluk', short: 'Y', color: '#8ab8c0' },
] as const;

export function moleculeAccent(index: number): string {
  return MOLECULE_ACCENTS[index % MOLECULE_ACCENTS.length];
}

export function toList(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const text = typeof item === 'string' ? item.trim() : '';
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= max) break;
  }
  return out;
}

export function clampPercent(value: unknown, fallback = 50): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function normalizeEvidenceLevel(value: unknown): MoleculeEvidenceLevel {
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

export function sanitizeMolecules(value: unknown): MoleculeItem[] {
  if (!Array.isArray(value)) return [];
  const sanitized: MoleculeItem[] = [];
  value.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const row = item as Record<string, unknown>;
    const name = typeof row.name === 'string' ? row.name.trim() : '';
    if (!name) return;
    sanitized.push({
      name,
      smiles: typeof row.smiles === 'string' ? row.smiles : '',
      formula: typeof row.formula === 'string' ? row.formula : '',
      family: typeof row.family === 'string' ? row.family : '',
      origin: typeof row.origin === 'string' ? row.origin : '',
      note: typeof row.note === 'string' ? row.note : '',
      contribution: typeof row.contribution === 'string' ? row.contribution : '',
      evidence: typeof row.evidence === 'string' ? row.evidence : '',
      evidenceLevel: normalizeEvidenceLevel(row.evidenceLevel ?? row.evidence_level),
      evidenceLabel:
        typeof row.evidenceLabel === 'string'
          ? row.evidenceLabel
          : typeof row.evidence_label === 'string'
            ? row.evidence_label
            : '',
      evidenceReason:
        typeof row.evidenceReason === 'string'
          ? row.evidenceReason
          : typeof row.evidence_reason === 'string'
            ? row.evidence_reason
            : '',
      matchedNotes: Array.isArray(row.matchedNotes)
        ? row.matchedNotes.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        : Array.isArray(row.matched_notes)
          ? row.matched_notes.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
          : [],
    });
  });
  return sanitized;
}

function normalizeMoleculeNote(note: string, index: number, total: number): MoleculeData['note'] {
  const text = note.toLowerCase();
  if (text.includes('top') || text.includes('ust') || text.includes('ilk')) return 'top';
  if (text.includes('heart') || text.includes('kalp') || text.includes('middle') || text.includes('orta')) return 'heart';
  if (text.includes('base') || text.includes('baz') || text.includes('alt') || text.includes('dry')) return 'base';
  if (index === 0) return 'top';
  if (index >= Math.max(1, total - 2)) return 'base';
  return 'heart';
}

function parseContributionPct(value: string, index: number, total: number): number {
  const match = value.match(/(\d{1,3})/);
  if (match) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed)) return clampPercent(parsed, 0);
  }
  const fallback = 72 - index * Math.max(8, Math.floor(48 / Math.max(2, total)));
  return clampPercent(fallback, 50);
}

function resolveMoleculeType(family: string): string {
  return family.trim() || 'Aromatik bileşik';
}

function resolveMoleculeOrigin(origin: string): string[] {
  const list = origin
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length > 0 ? list.slice(0, 4) : ['Nota izi'];
}

function buildMoleculeExplanation(
  item: MoleculeItem,
  note: MoleculeData['note'],
  profileTags: string[],
  families: string,
  linkedFragrances: string[],
): string {
  if (item.evidenceReason?.trim()) {
    return item.evidenceReason.trim();
  }

  if (linkedFragrances.length > 0) {
    return `Bu molekül ${linkedFragrances.slice(0, 2).join(', ')} parfümlerinde savunulabilir bir iz bırakıyor.`;
  }

  const roleLabel = note === 'top' ? 'ilk açılışı' : note === 'heart' ? 'kalp notalarını' : 'kalan izi';
  const profileText = profileTags.length > 0 ? profileTags.slice(0, 2).join(' • ').toLowerCase() : '';
  const familyText = families.trim();

  if (profileText && familyText) {
    return `${item.name}, ${familyText.toLowerCase()} çizgiyi ${profileText} karakteriyle güçlendirip bu parfümün ${roleLabel} belirginleştiriyor.`;
  }

  if (familyText) {
    return `${item.name}, ${familyText.toLowerCase()} etkisiyle bu parfümün ${roleLabel} karakteristik hale getiriyor.`;
  }

  return `${item.name}, kompozisyonun ${roleLabel} öne çıkan karakter moleküllerinden biri olarak çalışıyor.`;
}

export function resolveEvidenceTone(level: MoleculeEvidenceLevel): { label: string; reason: string; accent: string } {
  switch (level) {
    case 'signature_molecule':
      return { label: 'İmza Molekül', reason: 'Küratörlü katalogda imza iz olarak yer alıyor.', accent: '#a78bfa' };
    case 'verified_component':
      return {
        label: 'Doğrulanmış Bileşen',
        reason: 'Küratörlü kaynakta savunulabilir bileşen olarak yer alıyor.',
        accent: 'var(--gold)',
      };
    case 'accord_component':
      return { label: 'Muhtemel Akor Bileşeni', reason: 'Birden fazla nota izinin ortak akorunda beliriyor.', accent: 'var(--sage)' };
    case 'note_match':
      return { label: 'Nota Eşleşmesi', reason: 'Nota ve molekül haritası tarafından destekleniyor.', accent: '#d8b06d' };
    case 'unmatched':
      return {
        label: 'Henüz Eşleşmedi',
        reason: 'Bu molekül için savunulabilir parfüm bağlantısı kurulmadı.',
        accent: 'rgba(255,255,255,.45)',
      };
    default:
      return { label: 'Nota Eşleşmesi', reason: 'Nota ve molekül haritası tarafından destekleniyor.', accent: '#d8b06d' };
  }
}

function buildPresenceCopy(
  name: string,
  level: MoleculeEvidenceLevel,
  matchedNotes: string[],
  linkedFragrances: string[],
): string {
  const tone = resolveEvidenceTone(level);
  if (linkedFragrances.length > 0) {
    return `Bu molekül ${linkedFragrances.slice(0, 2).join(', ')} gibi parfümlerde savunulabilir bir iz sunuyor.`;
  }

  if (matchedNotes.length > 0) {
    return `${matchedNotes.slice(0, 2).join(', ')} izi ${name} molekülünü destekliyor.`;
  }

  return tone.reason;
}

export function traceStrengthLabel(value: number): string {
  if (value >= 72) return 'Yüksek iz';
  if (value >= 54) return 'Belirgin iz';
  if (value >= 36) return 'Destekleyici iz';
  return 'Nazik iz';
}

export function toMoleculeData(
  molecules: MoleculeItem[],
  lookup: Record<string, MoleculeLookupRow>,
  fragranceName?: string,
): MoleculeData[] {
  const fragrance = fragranceName ? getPublicFragranceByName(fragranceName) : null;

  return molecules.flatMap((item, index) => {
    const resolved = lookup[item.name.toLowerCase()] || {};
    const catalog = getPublicMoleculeByName(item.name);
    if (!catalog) return [];
    if ((catalog.linked_fragrances_count || 0) === 0 && !catalog.is_iconic) return [];

    const relation = fragrance?.key_molecules.find(
      (entry) =>
        entry.slug === catalog.slug || entry.name.trim().toLowerCase() === item.name.trim().toLowerCase(),
    );
    const note = normalizeMoleculeNote(item.note, index, molecules.length);
    const smiles = resolved.smiles || item.smiles || catalog.smiles || undefined;
    const verified = Boolean(smiles);
    const formula = verified ? resolved.formula || item.formula || catalog.iupac_name || '' : '';
    const family = resolved.family || item.family || catalog.families.join(' • ') || '';
    const origin = resolved.origin || item.origin || catalog.natural_source || '';
    const profileTags = catalog.profile_tags ?? [];
    const evidenceLevel =
      relation?.evidence_level ||
      item.evidenceLevel ||
      catalog.primary_evidence_level ||
      (catalog.is_iconic ? 'signature_molecule' : 'unmatched');
    const matchedNotes =
      relation?.matched_notes?.length
        ? relation.matched_notes
        : item.matchedNotes && item.matchedNotes.length > 0
          ? item.matchedNotes
          : item.note
            ? [item.note]
            : [];
    const linkedFragrances = catalog.linked_fragrance_names || [];
    const evidenceTone = resolveEvidenceTone(evidenceLevel);
    const strength = relation?.percentage || parseContributionPct(item.contribution, index, molecules.length);

    return [
      {
        name: item.name,
        formula,
        type: verified ? resolveMoleculeType(family) : 'Doğrulanmamış nota izi',
        note,
        origin: resolveMoleculeOrigin(origin),
        pct: strength,
        smiles,
        verified,
        slug: catalog.slug,
        casNumber: catalog.cas_number,
        profileTags,
        funFact: catalog.fun_fact,
        explanation: buildMoleculeExplanation(item, note, profileTags, family, linkedFragrances),
        evidenceLevel,
        evidenceLabel: evidenceTone.label,
        evidenceReason: relation?.evidence_reason || item.evidenceReason || evidenceTone.reason,
        matchedNotes,
        presenceCopy: buildPresenceCopy(item.name, evidenceLevel, matchedNotes, linkedFragrances),
        linkedFragrances,
        evidenceAccent: evidenceTone.accent,
        traceStrengthLabel: traceStrengthLabel(strength),
      },
    ];
  });
}

export function buildSimilarItems(values: string[]): SimilarItem[] {
  return values.map((raw, index) => {
    const label = String(raw || '').trim();
    const pctMatch = label.match(/(\d{1,3})\s*%/);
    const similarity = pctMatch ? clampPercent(Number(pctMatch[1]), 75) : clampPercent(96 - index * 4, 70);
    const clean = pctMatch ? label.replace(/\(?\s*\d{1,3}\s*%\s*\)?/g, '').trim() : label;
    return {
      name: clean || label || `Benzer profil ${index + 1}`,
      similarity,
    };
  });
}

export function resolveConfidence(result: AnalysisResult): number {
  const topNotes = toList(result.pyramid?.top, 6).length;
  const heartNotes = toList(result.pyramid?.middle, 8).length;
  const baseNotes = toList(result.pyramid?.base, 8).length;
  const noteCoverage = Math.min((topNotes + heartNotes + baseNotes) * 2.4, 22);
  const moleculeCoverage = Math.min(sanitizeMolecules(result.molecules).length * 4.5, 18);
  const similarCoverage = Math.min(toList(result.similar, 10).length * 2.5, 12);
  const technicalCoverage = Math.min(
    result.technical.filter((item) => typeof item.score === 'number' && Number.isFinite(item.score)).length * 4,
    16,
  );
  const personaCoverage = result.persona ? 8 : 0;
  const timelineCoverage = result.timeline ? 8 : 0;
  const dupeCoverage = Math.min(toList(result.dupes, 8).length * 1.5, 6);
  const descriptionCoverage = Math.min(Math.max(result.description.trim().length - 90, 0) / 12, 8);
  const intensityCoverage = clampPercent(result.intensity, 65) * 0.08;

  const derivedScore = clampPercent(
    34 +
      noteCoverage +
      moleculeCoverage +
      similarCoverage +
      technicalCoverage +
      personaCoverage +
      timelineCoverage +
      dupeCoverage +
      descriptionCoverage +
      intensityCoverage,
    78,
  );

  if (typeof result.confidence === 'number' && Number.isFinite(result.confidence)) {
    return clampPercent(Math.round(derivedScore * 0.7 + clampPercent(result.confidence, 87) * 0.3), derivedScore);
  }

  return derivedScore;
}

export function resolveMetricScore(items: TechnicalItem[], matcher: RegExp, fallback: number): number {
  const hit = items.find((item) => matcher.test(item.label.toLowerCase()));
  return clampPercent(hit?.score, fallback);
}

export function resolvePreferenceMatch(
  result: AnalysisResult,
  prefs: OnboardingPreferences | null,
): { score: number; summary: string } {
  if (!prefs) {
    return { score: 0, summary: 'Kişisel tercih profili henüz kurulmadı.' };
  }

  let score = 0;
  const matches: string[] = [];
  const seasonHit = prefs.season && result.season.some((item) => item.toLowerCase() === prefs.season.toLowerCase());
  if (seasonHit) {
    score += 16;
    matches.push(`${prefs.season} ritmine uyuyor`);
  }

  const vibe = result.persona?.vibe?.toLowerCase() || '';
  const family = result.family.toLowerCase();
  const stanceMatchers: Record<string, string[]> = {
    Sakin: ['sakin', 'temiz', 'soft', 'minimal', 'fresh'],
    Carpici: ['çarpıcı', 'guclu', 'güçlü', 'yoğun', 'yogun', 'gece', 'oryantal'],
    Sofistike: ['sofistike', 'zarif', 'odunsu', 'amber', 'şık', 'sik'],
  };

  if (prefs.stance) {
    const matcherKey = prefs.stance === 'Çarpıcı' ? 'Carpici' : prefs.stance;
    const stanceHit = stanceMatchers[matcherKey].some((item) => vibe.includes(item) || family.includes(item));
    if (stanceHit) {
      score += 14;
      matches.push(`${prefs.stance} tavrını destekliyor`);
    }
  }

  if (prefs.intensity) {
    const intensity = clampPercent(result.intensity, 65);
    const wantedBand =
      prefs.intensity === 'Hafif' ? intensity <= 42 : prefs.intensity === 'Orta' ? intensity >= 35 && intensity <= 72 : intensity >= 65;
    if (wantedBand) {
      score += 16;
      matches.push(`${prefs.intensity.toLowerCase()} yoğunluk beklentine yakın`);
    }
  }

  return {
    score,
    summary: matches.length > 0 ? matches.join(' • ') : 'Koku karakteri tercihlerine kısmen yakın görünüyor.',
  };
}
