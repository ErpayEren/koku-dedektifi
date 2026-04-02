export interface SeedMoleculeRecord {
  id: string;
  slug: string;
  name: string;
  iupac_name: string;
  smiles: string;
  cas_number: string;
  odor_description: string;
  odor_intensity: 'subtle' | 'moderate' | 'powerful';
  longevity_contribution: 'top' | 'heart' | 'base' | 'structure';
  usage_percentage_typical: number;
  natural_source: string;
  discovery_year: number;
  fun_fact: string;
}

export interface SeedFragranceMoleculeRef {
  molecule_slug: string;
  percentage: number;
  role: 'top' | 'heart' | 'base' | 'structure';
}

export interface SeedCommunityVotes {
  strong: number;
  balanced: number;
  light: number;
}

export interface SeedFragranceRecord {
  id: string;
  slug: string;
  name: string;
  brand: string;
  year: number;
  perfumer: string;
  concentration: string;
  gender_profile: 'masculine' | 'feminine' | 'unisex';
  seasons: string[];
  occasions: string[];
  longevity_score: number;
  sillage_score: number;
  price_tier: 'budget' | 'mid' | 'premium' | 'luxury' | 'ultra-luxury';
  top_notes: string[];
  heart_notes: string[];
  base_notes: string[];
  key_molecules: SeedFragranceMoleculeRef[];
  character_tags: string[];
  similar_slugs: string[];
  cover_image_url: string;
  molecule_preview_slug: string;
  community_votes: SeedCommunityVotes;
}

export interface CatalogSeedPayload {
  molecules: SeedMoleculeRecord[];
  fragrances: SeedFragranceRecord[];
}

export interface MoleculeCatalogRow extends Omit<SeedMoleculeRecord, 'slug'> {
  slug: string;
  found_in_fragrances: string[];
}

export type MoleculeEvidenceLevel = 'official' | 'mapped' | 'validated' | 'inferred';

export interface FragranceCatalogMolecule {
  id: string;
  slug: string;
  name: string;
  smiles: string;
  percentage: number;
  role: 'top' | 'heart' | 'base' | 'structure';
  evidence_level: MoleculeEvidenceLevel;
  confidence: number;
  evidence_reason: string;
  matched_notes: string[];
}

export interface FragranceCatalogRow extends Omit<SeedFragranceRecord, 'similar_slugs' | 'molecule_preview_slug' | 'key_molecules'> {
  similar_fragrances: string[];
  molecule_preview_smiles: string;
  key_molecules: FragranceCatalogMolecule[];
}
