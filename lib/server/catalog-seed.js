const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { cleanString } = require('./supabase-config');

function getRootDir() {
  return path.resolve(__dirname, '..', '..');
}

function loadCatalogSeed() {
  const seedPath = path.join(getRootDir(), 'data', 'catalog-seed.json');
  return JSON.parse(fs.readFileSync(seedPath, 'utf8'));
}

function buildCatalogRecords(seed) {
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

  return { molecules, fragrances };
}

function createSeedClient({ url, serviceRoleKey }) {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

async function seedCatalog(options) {
  const url = cleanString(options?.url);
  const serviceRoleKey = cleanString(options?.serviceRoleKey);
  const fragranceTable = cleanString(options?.fragranceTable) || 'fragrances';
  const moleculeTable = cleanString(options?.moleculeTable) || 'molecules';

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase URL veya service role key bulunamadi.');
  }

  const seed = loadCatalogSeed();
  const { molecules, fragrances } = buildCatalogRecords(seed);
  const supabase = createSeedClient({ url, serviceRoleKey });

  const moleculeResult = await supabase.from(moleculeTable).upsert(molecules, {
    onConflict: 'id',
  });

  if (moleculeResult.error) {
    throw new Error(`Molecule seed basarisiz: ${moleculeResult.error.message}`);
  }

  const fragranceResult = await supabase.from(fragranceTable).upsert(fragrances, {
    onConflict: 'id',
  });

  if (fragranceResult.error) {
    throw new Error(`Fragrance seed basarisiz: ${fragranceResult.error.message}`);
  }

  return {
    fragranceCount: fragrances.length,
    moleculeCount: molecules.length,
    fragranceTable,
    moleculeTable,
  };
}

module.exports = {
  loadCatalogSeed,
  buildCatalogRecords,
  seedCatalog,
};
