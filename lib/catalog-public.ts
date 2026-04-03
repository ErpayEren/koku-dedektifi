import curatedSeedJson from '@/data/catalog-seed.json';
import fragrancesJson from '@/fragrances.json';
import moleculesJson from '@/molecules.json';
import { buildEvidenceGraph } from '@/lib/molecule-evidence-engine';
import noteMoleculeMapJson from '@/note-molecule-map.json';
import type {
  CatalogSeedPayload,
  FragranceCatalogRow,
  MoleculeCatalogRow,
  MoleculeEvidenceLevel,
} from '@/lib/server/catalog-types';

interface Phase8Fragrance {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  year: number | null;
  concentration: string | null;
  perfumer: string | null;
  top_notes: string[];
  heart_notes: string[];
  base_notes: string[];
  seasons: string[];
  occasions: string[];
  gender_profile: 'masculine' | 'feminine' | 'unisex' | null;
  price_tier: 'budget' | 'mid' | 'premium' | 'luxury' | 'ultra-luxury' | null;
  cover_image_url: string | null;
  longevity_score: number | null;
  sillage_score: number | null;
  source?: string | null;
  similar_fragrance_slugs?: string[];
}

interface Phase8Molecule {
  id: string;
  slug: string;
  name: string;
  iupac_name: string | null;
  smiles: string;
  cas_number: string | null;
  odor_description: string | null;
  odor_intensity?: 'subtle' | 'moderate' | 'powerful' | null;
  longevity_contribution?: 'top' | 'heart' | 'base' | 'structure' | null;
  usage_percentage_typical?: number | null;
  natural_source: string | null;
  discovery_year: number | null;
  fun_fact?: string | null;
}

type MoleculeFamily =
  | 'Amber'
  | 'Odunsu'
  | 'Çiçeksi'
  | 'Narenciye'
  | 'Misk'
  | 'Baharatlı'
  | 'Akuatik'
  | 'Pudramsı'
  | 'Gourmand'
  | 'Yeşil';

export interface PublicMolecule extends MoleculeCatalogRow {
  families: MoleculeFamily[];
  source_type: 'Doğal' | 'Sentetik';
  profile_tags: string[];
  linked_fragrance_names: string[];
  linked_fragrances_count: number;
  primary_evidence_level: MoleculeEvidenceLevel;
  primary_evidence_label: string;
  is_iconic: boolean;
  canonical_slug: string;
}

export interface PublicFragrance extends FragranceCatalogRow {
  source?: string | null;
}

function normalizeText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_/]+/g, ' ')
    .trim()
    .toLowerCase();
}

function tokenizeDescription(value: string | null | undefined): string[] {
  return String(value || '')
    .split(/[,\u00b7]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferFamilies(description: string | null | undefined): MoleculeFamily[] {
  const text = String(description || '').toLowerCase();
  const families = new Set<MoleculeFamily>();

  if (/(amber|warm|mineral|resin)/.test(text)) families.add('Amber');
  if (/(wood|cedar|patchouli|dry|arid|sandal|vetiver)/.test(text)) families.add('Odunsu');
  if (/(floral|rose|jasmine|violet|orris|white flower|blossom)/.test(text)) families.add('Çiçeksi');
  if (/(citrus|orange|lemon|grapefruit|bergamot|mandarin)/.test(text)) families.add('Narenciye');
  if (/(musk|skin|sensual)/.test(text)) families.add('Misk');
  if (/(spicy|saffron|pepper|clove|cardamom|warmth)/.test(text)) families.add('Baharatlı');
  if (/(marine|watery|ozonic|sea|aquatic)/.test(text)) families.add('Akuatik');
  if (/(powder|powdery|lipstick|orris|iris)/.test(text)) families.add('Pudramsı');
  if (/(vanilla|gourmand|almond|toasted|sugar|honey|tonka|caramel|coffee)/.test(text)) families.add('Gourmand');
  if (/(green|herbal|lavender|sage|leafy)/.test(text)) families.add('Yeşil');

  return Array.from(families.size > 0 ? families : new Set<MoleculeFamily>(['Amber']));
}

function inferSourceType(naturalSource: string | null | undefined): 'Doğal' | 'Sentetik' {
  const text = String(naturalSource || '').toLowerCase();
  if (!text) return 'Sentetik';
  return /(seed|flower|leaf|wood|peel|root|fruit|natural|rose|jasmine|iris|grapefruit|lavender|vanilla)/.test(text)
    ? 'Doğal'
    : 'Sentetik';
}

const phase8Molecules = moleculesJson as Phase8Molecule[];
const phase8Fragrances = fragrancesJson as Phase8Fragrance[];
const curatedSeed = curatedSeedJson as CatalogSeedPayload;
const graph = buildEvidenceGraph({
  fragrances: phase8Fragrances,
  molecules: phase8Molecules,
  noteMap: noteMoleculeMapJson as Record<string, string[]>,
  curatedSeed,
});

const moleculeRows = (graph.molecules as PublicMolecule[]).map((item) => ({
  ...item,
  odor_intensity: item.odor_intensity || 'moderate',
  longevity_contribution: item.longevity_contribution || 'structure',
  usage_percentage_typical: item.usage_percentage_typical ?? 0,
  natural_source: item.natural_source || '',
  discovery_year: item.discovery_year ?? 0,
  fun_fact: item.fun_fact || '',
  families: inferFamilies(item.odor_description),
  source_type: inferSourceType(item.natural_source),
  profile_tags: tokenizeDescription(item.odor_description),
  linked_fragrance_names: item.linked_fragrance_names || [],
  linked_fragrances_count: item.linked_fragrances_count || item.found_in_fragrances.length,
  primary_evidence_level: item.primary_evidence_level || 'unmatched',
  primary_evidence_label: item.primary_evidence_label || 'Henüz Eşleşmedi',
  is_iconic: Boolean(item.is_iconic),
  canonical_slug: item.canonical_slug || item.slug,
}));

const fragranceRows = (graph.fragrances as PublicFragrance[]).map((item) => ({
  ...item,
  brand: item.brand || '',
  year: item.year ?? 0,
  perfumer: item.perfumer || '',
  concentration: item.concentration || '',
  gender_profile: item.gender_profile || 'unisex',
  seasons: item.seasons || [],
  occasions: item.occasions || [],
  longevity_score: item.longevity_score ?? 0,
  sillage_score: item.sillage_score ?? 0,
  price_tier: item.price_tier || 'mid',
  top_notes: item.top_notes || [],
  heart_notes: item.heart_notes || [],
  base_notes: item.base_notes || [],
  character_tags: item.character_tags || [],
  similar_fragrances: item.similar_fragrances || [],
  cover_image_url: item.cover_image_url || '',
  molecule_preview_smiles: item.molecule_preview_smiles || '',
  community_votes: item.community_votes || { strong: 0, balanced: 0, light: 0 },
}));

const moleculeBySlug = new Map(moleculeRows.map((item) => [item.slug, item]));
const moleculeByName = new Map(
  moleculeRows.flatMap((item) => [
    [item.name.trim().toLowerCase(), item] as const,
    [normalizeText(item.name), item] as const,
  ]),
);
const fragranceByName = new Map(
  fragranceRows.flatMap((item) => [
    [item.name.trim().toLowerCase(), item] as const,
    [normalizeText(`${item.brand} ${item.name}`), item] as const,
    [normalizeText(item.name), item] as const,
  ]),
);
const aliasToCanonical = new Map<string, string>(Object.entries(graph.aliasToCanonical || {}));

export function getPublicMolecules(): PublicMolecule[] {
  return moleculeRows;
}

export function getPublicFragrances(): PublicFragrance[] {
  return fragranceRows;
}

export function getPublicMoleculeBySlug(slug: string): PublicMolecule | null {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;
  const canonicalSlug = aliasToCanonical.get(normalized) || normalized;
  return moleculeBySlug.get(canonicalSlug) || null;
}

export function getPublicMoleculeByName(name: string): PublicMolecule | null {
  const trimmed = name.trim().toLowerCase();
  return moleculeByName.get(trimmed) || moleculeByName.get(normalizeText(name)) || null;
}

export function getPublicFragranceByName(name: string): PublicFragrance | null {
  const trimmed = name.trim().toLowerCase();
  return fragranceByName.get(trimmed) || fragranceByName.get(normalizeText(name)) || null;
}

export function getPublicFragrancesForMolecule(slug: string): PublicFragrance[] {
  const molecule = getPublicMoleculeBySlug(slug);
  if (!molecule) return [];
  return fragranceRows.filter((item) => item.key_molecules.some((entry) => entry.slug === molecule.slug));
}

export function buildMoleculeSearchText(molecule: PublicMolecule): string {
  return [
    molecule.name,
    molecule.iupac_name,
    molecule.odor_description,
    molecule.natural_source,
    molecule.families.join(' '),
    molecule.profile_tags.join(' '),
    molecule.linked_fragrance_names.join(' '),
  ]
    .join(' ')
    .toLowerCase();
}

export function getFeaturedMolecules(): PublicMolecule[] {
  const featured = ['ambroxide', 'iso-e-super', 'hedione'];
  return featured.map((slug) => getPublicMoleculeBySlug(slug)).filter((item): item is PublicMolecule => Boolean(item));
}
