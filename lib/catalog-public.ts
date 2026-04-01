import seedJson from '@/data/catalog-seed.json';
import type { CatalogSeedPayload, FragranceCatalogRow, MoleculeCatalogRow } from '@/lib/server/catalog-types';

const seed = seedJson as CatalogSeedPayload;

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

export interface PublicFragrance extends FragranceCatalogRow {}

const fragranceRows: PublicFragrance[] = seed.fragrances.map((item) => ({
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
  key_molecules: item.key_molecules.map((entry) => {
    const molecule = seed.molecules.find((candidate) => candidate.slug === entry.molecule_slug);
    return {
      id: molecule?.id ?? entry.molecule_slug,
      slug: entry.molecule_slug,
      name: molecule?.name ?? entry.molecule_slug,
      smiles: molecule?.smiles ?? '',
      percentage: entry.percentage,
      role: entry.role,
    };
  }),
  character_tags: item.character_tags,
  similar_fragrances: item.similar_slugs,
  cover_image_url: item.cover_image_url,
  molecule_preview_smiles: seed.molecules.find((molecule) => molecule.slug === item.molecule_preview_slug)?.smiles ?? '',
  community_votes: item.community_votes,
}));

function tokenizeDescription(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferFamilies(description: string): MoleculeFamily[] {
  const text = description.toLowerCase();
  const families = new Set<MoleculeFamily>();
  if (/(amber|warm|mineral)/.test(text)) families.add('Amber');
  if (/(wood|cedar|patchouli|dry|arid)/.test(text)) families.add('Odunsu');
  if (/(floral|rose|jasmine|violet|orris|white flower)/.test(text)) families.add('Çiçeksi');
  if (/(citrus|orange|lemon|grapefruit|bergamot)/.test(text)) families.add('Narenciye');
  if (/(musk|skin|sensual)/.test(text)) families.add('Misk');
  if (/(spicy|saffron|pepper|warmth)/.test(text)) families.add('Baharatlı');
  if (/(marine|watery|ozonic|sea)/.test(text)) families.add('Akuatik');
  if (/(powder|powdery|lipstick|orris|iris)/.test(text)) families.add('Pudramsı');
  if (/(vanilla|gourmand|almond|toasted|sugar|honey|tonka)/.test(text)) families.add('Gourmand');
  if (/(green|herbal|lavender|sage)/.test(text)) families.add('Yeşil');
  return Array.from(families.size > 0 ? families : new Set<MoleculeFamily>(['Amber']));
}

function inferSourceType(naturalSource: string): 'Doğal' | 'Sentetik' {
  const text = naturalSource.toLowerCase();
  return text.includes('sentetik') ? 'Sentetik' : 'Doğal';
}

const moleculeRows: PublicMolecule[] = seed.molecules.map((item) => {
  const found = seed.fragrances
    .filter((fragrance) => fragrance.key_molecules.some((entry) => entry.molecule_slug === item.slug))
    .map((fragrance) => fragrance.id);
  const profileTags = tokenizeDescription(item.odor_description);

  return {
    ...item,
    found_in_fragrances: found,
    families: inferFamilies(item.odor_description),
    source_type: inferSourceType(item.natural_source),
    profile_tags: profileTags,
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
