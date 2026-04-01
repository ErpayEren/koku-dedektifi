import seedJson from '@/data/catalog-seed.json';
import { getSupabase } from '@/lib/supabase';
import type {
  CatalogSeedPayload,
  FragranceCatalogMolecule,
  FragranceCatalogRow,
  MoleculeCatalogRow,
  SeedFragranceRecord,
  SeedMoleculeRecord,
} from './catalog-types';

const rawSeed = seedJson as CatalogSeedPayload;

export const SUPABASE_FRAGRANCES_TABLE = process.env.SUPABASE_FRAGRANCES_TABLE ?? 'fragrances';
export const SUPABASE_MOLECULES_TABLE = process.env.SUPABASE_MOLECULES_TABLE ?? 'molecules';
export const SUPABASE_ANALYSES_TABLE = process.env.SUPABASE_ANALYSES_TABLE ?? 'analyses';

function moleculeMap(): Map<string, SeedMoleculeRecord> {
  return new Map(rawSeed.molecules.map((item) => [item.slug, item]));
}

function fragranceMap(): Map<string, SeedFragranceRecord> {
  return new Map(rawSeed.fragrances.map((item) => [item.slug, item]));
}

function buildFragranceMolecules(fragrance: SeedFragranceRecord): FragranceCatalogMolecule[] {
  const molecules = moleculeMap();
  return fragrance.key_molecules
    .map((item) => {
      const molecule = molecules.get(item.molecule_slug);
      if (!molecule) return null;
      return {
        id: molecule.id,
        slug: molecule.slug,
        name: molecule.name,
        smiles: molecule.smiles,
        percentage: item.percentage,
        role: item.role,
      };
    })
    .filter((item): item is FragranceCatalogMolecule => Boolean(item));
}

function buildSeedFragranceRows(): FragranceCatalogRow[] {
  const fragrances = fragranceMap();
  const molecules = moleculeMap();

  return rawSeed.fragrances.map((item) => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    brand: item.brand,
    year: item.year,
    perfumer: item.perfumer,
    concentration: item.concentration,
    gender_profile: item.gender_profile,
    seasons: item.seasons,
    occasions: item.occasions,
    longevity_score: item.longevity_score,
    sillage_score: item.sillage_score,
    price_tier: item.price_tier,
    top_notes: item.top_notes,
    heart_notes: item.heart_notes,
    base_notes: item.base_notes,
    key_molecules: buildFragranceMolecules(item),
    character_tags: item.character_tags,
    similar_fragrances: item.similar_slugs
      .map((slug) => fragrances.get(slug)?.id ?? '')
      .filter(Boolean),
    cover_image_url: item.cover_image_url,
    molecule_preview_smiles: molecules.get(item.molecule_preview_slug)?.smiles ?? '',
    community_votes: item.community_votes,
  }));
}

function buildSeedMoleculeRows(): MoleculeCatalogRow[] {
  return rawSeed.molecules.map((item) => ({
    ...item,
    found_in_fragrances: rawSeed.fragrances
      .filter((fragrance) => fragrance.key_molecules.some((entry) => entry.molecule_slug === item.slug))
      .map((fragrance) => fragrance.id),
  }));
}

const seedFragranceRows = buildSeedFragranceRows();
const seedMoleculeRows = buildSeedMoleculeRows();

export function getSeedFragrances(): FragranceCatalogRow[] {
  return seedFragranceRows;
}

export function getSeedMolecules(): MoleculeCatalogRow[] {
  return seedMoleculeRows;
}

export async function listCatalogFragrances(): Promise<FragranceCatalogRow[]> {
  const client = getSupabase();
  if (!client) return seedFragranceRows;

  const { data, error } = await client
    .from(SUPABASE_FRAGRANCES_TABLE)
    .select('*')
    .order('name', { ascending: true });

  if (error || !Array.isArray(data) || data.length === 0) {
    return seedFragranceRows;
  }

  return data as FragranceCatalogRow[];
}

export async function listCatalogMolecules(): Promise<MoleculeCatalogRow[]> {
  const client = getSupabase();
  if (!client) return seedMoleculeRows;

  const { data, error } = await client
    .from(SUPABASE_MOLECULES_TABLE)
    .select('*')
    .order('name', { ascending: true });

  if (error || !Array.isArray(data) || data.length === 0) {
    return seedMoleculeRows;
  }

  return data as MoleculeCatalogRow[];
}

export async function getCatalogFragranceBySlug(slug: string): Promise<FragranceCatalogRow | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const client = getSupabase();
  if (!client) {
    return seedFragranceRows.find((item) => item.slug === normalized) ?? null;
  }

  const { data, error } = await client
    .from(SUPABASE_FRAGRANCES_TABLE)
    .select('*')
    .eq('slug', normalized)
    .maybeSingle();

  if (error || !data) {
    return seedFragranceRows.find((item) => item.slug === normalized) ?? null;
  }

  return data as FragranceCatalogRow;
}

export async function getCatalogMoleculeBySlug(slug: string): Promise<MoleculeCatalogRow | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const client = getSupabase();
  if (!client) {
    return seedMoleculeRows.find((item) => item.slug === normalized) ?? null;
  }

  const { data, error } = await client
    .from(SUPABASE_MOLECULES_TABLE)
    .select('*')
    .eq('slug', normalized)
    .maybeSingle();

  if (error || !data) {
    return seedMoleculeRows.find((item) => item.slug === normalized) ?? null;
  }

  return data as MoleculeCatalogRow;
}
