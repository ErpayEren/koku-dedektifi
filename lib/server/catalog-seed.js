const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { cleanString } = require('./supabase-config');

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

  if (fs.existsSync(fragrancesPath) && fs.existsSync(moleculesPath) && fs.existsSync(noteMapPath)) {
    return {
      mode: 'phase8',
      fragrances: readJson(fragrancesPath),
      molecules: readJson(moleculesPath),
      noteMap: readJson(noteMapPath),
    };
  }

  const legacySeedPath = path.join(rootDir, 'data', 'catalog-seed.json');
  return {
    mode: 'legacy',
    ...readJson(legacySeedPath),
  };
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

function mapNotesToMolecules(notes, moleculeIndex, noteMap) {
  const picked = [];
  const seen = new Set();

  notes.forEach((entry) => {
    const normalizedNote = normalizeText(entry.note);
    Object.entries(noteMap).forEach(([key, slugs]) => {
      if (!normalizedNote.includes(normalizeText(key))) return;
      slugs.forEach((slug) => {
        const molecule = moleculeIndex.get(slug);
        if (!molecule || seen.has(molecule.slug)) return;
        seen.add(molecule.slug);
        picked.push({
          id: molecule.id,
          slug: molecule.slug,
          name: molecule.name,
          smiles: molecule.smiles,
          percentage: null,
          role: entry.role,
          source: 'note-map-derived',
        });
      });
    });
  });

  return picked.slice(0, 6);
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
  const moleculeIndex = new Map(seed.molecules.map((item) => [item.slug, item]));
  const fragranceIndex = new Map(seed.fragrances.map((item) => [item.slug, item]));

  const fragrances = seed.fragrances.map((item) => {
    const notes = [
      ...(item.top_notes || []).map((note) => ({ note, role: 'top' })),
      ...(item.heart_notes || []).map((note) => ({ note, role: 'heart' })),
      ...(item.base_notes || []).map((note) => ({ note, role: 'base' })),
    ];
    const keyMolecules = mapNotesToMolecules(notes, moleculeIndex, seed.noteMap);
    return {
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
      key_molecules: keyMolecules,
      character_tags: item.character_tags || [],
      similar_fragrances: (item.similar_fragrance_slugs || [])
        .map((slug) => fragranceIndex.get(slug)?.id || null)
        .filter(Boolean),
      cover_image_url: item.cover_image_url || null,
      molecule_preview_smiles: keyMolecules[0]?.smiles || null,
      community_votes: item.community_votes || { strong: 0, balanced: 0, light: 0 },
    };
  });

  const molecules = seed.molecules.map((item) => ({
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
    found_in_fragrances: fragrances
      .filter((fragrance) => (fragrance.key_molecules || []).some((entry) => entry.id === item.id))
      .map((fragrance) => fragrance.id),
    natural_source: item.natural_source || null,
    discovery_year: item.discovery_year || null,
    fun_fact: item.fun_fact || null,
  }));

  return { molecules, fragrances };
}

function buildCatalogRecords(seed) {
  if (seed.mode === 'phase8') {
    return buildPhase8CatalogRecords(seed);
  }
  return buildLegacyCatalogRecords(seed);
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
    mode: seed.mode,
  };
}

module.exports = {
  loadCatalogSeed,
  buildCatalogRecords,
  seedCatalog,
};
