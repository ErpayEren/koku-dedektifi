import fragrancesJson from '@/fragrances.json';
import moleculesJson from '@/molecules.json';
import noteMoleculeMapJson from '@/note-molecule-map.json';
import type { FragranceCatalogMolecule, FragranceCatalogRow, MoleculeCatalogRow } from '@/lib/server/catalog-types';

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
}

export interface PublicFragrance extends FragranceCatalogRow {
  source?: string | null;
}

function normalizeText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function tokenizeDescription(value: string | null | undefined): string[] {
  return String(value || '')
    .split(',')
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

function inferOdorIntensity(
  description: string | null | undefined,
  existing: string | null | undefined,
): 'subtle' | 'moderate' | 'powerful' {
  if (existing === 'subtle' || existing === 'moderate' || existing === 'powerful') return existing;
  const text = String(description || '').toLowerCase();
  if (/(powerful|strong|intense|diffusive|radiant|animalic)/.test(text)) return 'powerful';
  if (/(soft|subtle|delicate|airy)/.test(text)) return 'subtle';
  return 'moderate';
}

function inferLongevityRole(
  existing: string | null | undefined,
  description: string | null | undefined,
): 'top' | 'heart' | 'base' | 'structure' {
  if (existing === 'top' || existing === 'heart' || existing === 'base' || existing === 'structure') return existing;
  const text = String(description || '').toLowerCase();
  if (/(top|citrus|sparkling|opening)/.test(text)) return 'top';
  if (/(base|musk|amber|patchouli|wood|vanilla|lasting)/.test(text)) return 'base';
  if (/(structure|diffusion|carrier)/.test(text)) return 'structure';
  return 'heart';
}

const moleculesSource = moleculesJson as Phase8Molecule[];
const fragrancesSource = fragrancesJson as Phase8Fragrance[];
const noteMap = noteMoleculeMapJson as Record<string, string[]>;

const moleculeRows: PublicMolecule[] = moleculesSource.map((item) => {
  const found = fragrancesSource
    .filter((fragrance) => {
      const notes = [...fragrance.top_notes, ...fragrance.heart_notes, ...fragrance.base_notes];
      const normalizedNotes = notes.map(normalizeText);
      return Object.entries(noteMap).some(([noteKey, moleculeSlugs]) => {
        if (!moleculeSlugs.includes(item.slug)) return false;
        return normalizedNotes.some((note) => note.includes(normalizeText(noteKey)));
      });
    })
    .map((fragrance) => fragrance.id);

  const description = item.odor_description || '';

  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    iupac_name: item.iupac_name || '',
    smiles: item.smiles,
    cas_number: item.cas_number || '',
    odor_description: description,
    odor_intensity: inferOdorIntensity(description, item.odor_intensity ?? null),
    longevity_contribution: inferLongevityRole(item.longevity_contribution ?? null, description),
    usage_percentage_typical: item.usage_percentage_typical ?? 0,
    natural_source: item.natural_source || '',
    discovery_year: item.discovery_year ?? 0,
    fun_fact: item.fun_fact || '',
    found_in_fragrances: found,
    families: inferFamilies(description),
    source_type: inferSourceType(item.natural_source),
    profile_tags: tokenizeDescription(description),
  };
});

const moleculeBySlug = new Map(moleculeRows.map((item) => [item.slug, item]));

function deriveKeyMolecules(fragrance: Phase8Fragrance): FragranceCatalogMolecule[] {
  const notes = [
    ...fragrance.top_notes.map((note) => ({ note, role: 'top' as const })),
    ...fragrance.heart_notes.map((note) => ({ note, role: 'heart' as const })),
    ...fragrance.base_notes.map((note) => ({ note, role: 'base' as const })),
  ];

  const picked: FragranceCatalogMolecule[] = [];
  const seen = new Set<string>();

  for (const entry of notes) {
    const normalized = normalizeText(entry.note);
    for (const [noteKey, slugs] of Object.entries(noteMap)) {
      if (!normalized.includes(normalizeText(noteKey))) continue;
      for (const slug of slugs) {
        const molecule = moleculeBySlug.get(slug);
        if (!molecule || seen.has(molecule.slug)) continue;
        seen.add(molecule.slug);
        picked.push({
          id: molecule.id,
          slug: molecule.slug,
          name: molecule.name,
          smiles: molecule.smiles,
          percentage: Math.max(10, 70 - picked.length * 9),
          role: entry.role,
        });
      }
    }
    if (picked.length >= 6) break;
  }

  return picked.slice(0, 6);
}

const fragranceRows: PublicFragrance[] = fragrancesSource.map((item) => {
  const keyMolecules = deriveKeyMolecules(item);
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    brand: item.brand || '',
    year: item.year ?? 0,
    perfumer: item.perfumer || '',
    concentration: item.concentration || '',
    gender_profile: (item.gender_profile as 'masculine' | 'feminine' | 'unisex') || 'unisex',
    seasons: item.seasons || [],
    occasions: item.occasions || [],
    longevity_score: item.longevity_score ?? 0,
    sillage_score: item.sillage_score ?? 0,
    price_tier: (item.price_tier as 'budget' | 'mid' | 'premium' | 'luxury' | 'ultra-luxury') || 'mid',
    top_notes: item.top_notes || [],
    heart_notes: item.heart_notes || [],
    base_notes: item.base_notes || [],
    key_molecules: keyMolecules,
    character_tags: [],
    similar_fragrances: item.similar_fragrance_slugs || [],
    cover_image_url: item.cover_image_url || '',
    molecule_preview_smiles: keyMolecules[0]?.smiles || '',
    community_votes: { strong: 0, balanced: 0, light: 0 },
    source: item.source || null,
  };
});

export function getPublicMolecules(): PublicMolecule[] {
  return moleculeRows;
}

export function getPublicFragrances(): PublicFragrance[] {
  return fragranceRows;
}

export function getPublicMoleculeBySlug(slug: string): PublicMolecule | null {
  const normalized = slug.trim().toLowerCase();
  return moleculeRows.find((item) => item.slug === normalized) ?? null;
}

export function getPublicMoleculeByName(name: string): PublicMolecule | null {
  const normalized = name.trim().toLowerCase();
  return moleculeRows.find((item) => item.name.trim().toLowerCase() === normalized) ?? null;
}

export function getPublicFragrancesForMolecule(slug: string): PublicFragrance[] {
  const normalized = slug.trim().toLowerCase();
  return fragranceRows.filter((item) => item.key_molecules.some((entry) => entry.slug === normalized));
}

export function buildMoleculeSearchText(molecule: PublicMolecule): string {
  return [
    molecule.name,
    molecule.iupac_name,
    molecule.odor_description,
    molecule.natural_source,
    molecule.families.join(' '),
    molecule.profile_tags.join(' '),
  ]
    .join(' ')
    .toLowerCase();
}

export function getFeaturedMolecules(): PublicMolecule[] {
  const featured = ['ambroxide', 'iso-e-super', 'hedione'];
  return featured
    .map((slug) => getPublicMoleculeBySlug(slug))
    .filter((item): item is PublicMolecule => Boolean(item));
}
