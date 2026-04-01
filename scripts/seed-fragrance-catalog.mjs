import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function loadEnvFile(fileName) {
  const filePath = path.join(rootDir, fileName);
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL veya service role key bulunamadi. Once .env.local veya ortam degiskenlerini tanimla.');
}

const seedPath = path.join(rootDir, 'data', 'catalog-seed.json');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const moleculeBySlug = new Map(seed.molecules.map((item) => [item.slug, item]));
const fragranceBySlug = new Map(seed.fragrances.map((item) => [item.slug, item]));

const molecules = seed.molecules.map((item) => ({
  ...item,
  found_in_fragrances: seed.fragrances
    .filter((fragrance) => fragrance.key_molecules.some((entry) => entry.molecule_slug === item.slug))
    .map((fragrance) => fragrance.id),
}));

const fragrances = seed.fragrances.map((item) => ({
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
  key_molecules: item.key_molecules
    .map((entry) => {
      const molecule = moleculeBySlug.get(entry.molecule_slug);
      if (!molecule) return null;
      return {
        id: molecule.id,
        slug: molecule.slug,
        name: molecule.name,
        smiles: molecule.smiles,
        percentage: entry.percentage,
        role: entry.role,
      };
    })
    .filter(Boolean),
  character_tags: item.character_tags,
  similar_fragrances: item.similar_slugs
    .map((slug) => fragranceBySlug.get(slug)?.id || '')
    .filter(Boolean),
  cover_image_url: item.cover_image_url,
  molecule_preview_smiles: moleculeBySlug.get(item.molecule_preview_slug)?.smiles || '',
  community_votes: item.community_votes,
}));

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const moleculeResult = await supabase.from(process.env.SUPABASE_MOLECULES_TABLE || 'molecules').upsert(molecules, {
  onConflict: 'id',
});

if (moleculeResult.error) {
  throw new Error(`Molecule seed basarisiz: ${moleculeResult.error.message}`);
}

const fragranceResult = await supabase.from(process.env.SUPABASE_FRAGRANCES_TABLE || 'fragrances').upsert(fragrances, {
  onConflict: 'id',
});

if (fragranceResult.error) {
  throw new Error(`Fragrance seed basarisiz: ${fragranceResult.error.message}`);
}

console.log(`Catalog seed tamamlandi. Molekuller: ${molecules.length}, parfumler: ${fragrances.length}`);
