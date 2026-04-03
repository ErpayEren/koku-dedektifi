const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { cleanString } = require('./supabase-config');
const { buildEvidenceGraph } = require('../molecule-evidence-engine');
const phase8CatalogData = require('./phase8-catalog-data');

function getRootDir() {
  return path.resolve(__dirname, '..', '..');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadCatalogSeed() {
  const rootDir = getRootDir();
  const fragrancesPath = path.join(rootDir, 'fragrances.json');
  const moleculesPath = path.join(rootDir, 'molecules.json');
  const noteMapPath = path.join(rootDir, 'note-molecule-map.json');
  const bundledFragrances = Array.isArray(phase8CatalogData?.fragrances) ? phase8CatalogData.fragrances : null;
  const bundledMolecules = Array.isArray(phase8CatalogData?.molecules) ? phase8CatalogData.molecules : null;
  const bundledNoteMap = phase8CatalogData?.noteMap && typeof phase8CatalogData.noteMap === 'object' ? phase8CatalogData.noteMap : null;

  if (
    (fs.existsSync(fragrancesPath) && fs.existsSync(moleculesPath) && fs.existsSync(noteMapPath)) ||
    (Array.isArray(bundledFragrances) && Array.isArray(bundledMolecules) && bundledNoteMap && typeof bundledNoteMap === 'object')
  ) {
    return {
      mode: 'phase8',
      fragrances: fs.existsSync(fragrancesPath) ? readJson(fragrancesPath) : bundledFragrances,
      molecules: fs.existsSync(moleculesPath) ? readJson(moleculesPath) : bundledMolecules,
      noteMap: fs.existsSync(noteMapPath) ? readJson(noteMapPath) : bundledNoteMap,
    };
  }

  const legacySeedPath = path.join(rootDir, 'data', 'catalog-seed.json');
  const bundledLegacySeed = require('../../data/catalog-seed.json');
  return {
    mode: 'legacy',
    ...(fs.existsSync(legacySeedPath) ? readJson(legacySeedPath) : bundledLegacySeed),
  };
}

function buildLegacyCatalogRecords(seed) {
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

function buildPhase8CatalogRecords(seed) {
  const curatedSeed = readJson(path.join(getRootDir(), 'data', 'catalog-seed.json'));
  const graph = buildEvidenceGraph({
    fragrances: seed.fragrances,
    molecules: seed.molecules,
    noteMap: seed.noteMap,
    curatedSeed,
  });
  const fragranceIndex = new Map(seed.fragrances.map((item) => [item.slug, item]));

  const fragrances = graph.fragrances.map((item) => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    brand: item.brand || null,
    year: item.year || null,
    perfumer: item.perfumer || null,
    concentration: item.concentration || null,
    gender_profile: item.gender_profile || null,
    seasons: item.seasons || [],
    occasions: item.occasions || [],
    longevity_score: item.longevity_score ?? null,
    sillage_score: item.sillage_score ?? null,
    price_tier: item.price_tier || null,
    top_notes: item.top_notes || [],
    heart_notes: item.heart_notes || [],
    base_notes: item.base_notes || [],
    key_molecules: item.key_molecules || [],
    character_tags: item.character_tags || [],
    similar_fragrances: (item.similar_fragrance_slugs || item.similar_fragrances || [])
      .map((slugOrId) => fragranceIndex.get(slugOrId)?.id || slugOrId || null)
      .filter(Boolean),
    cover_image_url: item.cover_image_url || null,
    molecule_preview_smiles: item.molecule_preview_smiles || null,
    community_votes: item.community_votes || { strong: 0, balanced: 0, light: 0 },
  }));

  const molecules = graph.allMolecules.map((item) => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    iupac_name: item.iupac_name || null,
    smiles: item.smiles,
    cas_number: item.cas_number || null,
    odor_description: item.odor_description || null,
    odor_intensity: item.odor_intensity || null,
    longevity_contribution: item.longevity_contribution || null,
    usage_percentage_typical: item.usage_percentage_typical ?? null,
    found_in_fragrances: item.found_in_fragrances || [],
    natural_source: item.natural_source || null,
    discovery_year: item.discovery_year || null,
    fun_fact: item.fun_fact || null,
  }));

  return { molecules, fragrances, relations: graph.relations || [], stats: graph.stats || {} };
}

function buildCatalogRecords(seed) {
  if (seed.mode === 'phase8') {
    return buildPhase8CatalogRecords(seed);
  }
  return { ...buildLegacyCatalogRecords(seed), relations: [], stats: {} };
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
  const evidenceTable = cleanString(options?.evidenceTable) || 'fragrance_molecule_evidence';

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase URL veya service role key bulunamadi.');
  }

  const seed = loadCatalogSeed();
  const { molecules, fragrances, relations, stats } = buildCatalogRecords(seed);
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

  let evidenceRelationCount = 0;
  if (Array.isArray(relations) && relations.length > 0) {
    const relationResult = await supabase.from(evidenceTable).upsert(relations, {
      onConflict: 'fragrance_id,molecule_id',
    });

    if (!relationResult.error) {
      evidenceRelationCount = relations.length;
    } else if (!/schema cache|could not find the table|relation .* does not exist/i.test(relationResult.error.message || '')) {
      throw new Error(`Evidence seed basarisiz: ${relationResult.error.message}`);
    }
  }

  return {
    fragranceCount: fragrances.length,
    moleculeCount: molecules.length,
    evidenceRelationCount,
    evidenceTable,
    fragranceTable,
    moleculeTable,
    mode: seed.mode,
    stats,
  };
}

module.exports = {
  loadCatalogSeed,
  buildCatalogRecords,
  seedCatalog,
};
