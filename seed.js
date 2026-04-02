const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, fileName), 'utf8'));
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

function slugify(value) {
  return normalizeText(value).replace(/\s+/g, '-');
}

function loadEnvFile(fileName) {
  const fullPath = path.join(__dirname, fileName);
  if (!fs.existsSync(fullPath)) return;
  const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

function mapNotesToMolecules(notes, moleculeIndex, noteMap) {
  const picked = [];
  const seen = new Set();

  notes.forEach((entry) => {
    const normalizedNote = normalizeText(entry.note);
    for (const [noteKey, moleculeSlugs] of Object.entries(noteMap)) {
      if (!normalizedNote.includes(normalizeText(noteKey))) continue;
      moleculeSlugs.forEach((slug) => {
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
    }
  });

  return picked.slice(0, 6);
}

function scoreFragranceSimilarity(target, candidate) {
  const targetNotes = new Set(
    [...target.top_notes, ...target.heart_notes, ...target.base_notes].map(normalizeText).filter(Boolean),
  );
  const candidateNotes = new Set(
    [...candidate.top_notes, ...candidate.heart_notes, ...candidate.base_notes].map(normalizeText).filter(Boolean),
  );
  const overlap = [...targetNotes].filter((note) => candidateNotes.has(note)).length;
  const union = new Set([...targetNotes, ...candidateNotes]).size || 1;
  return overlap / union;
}

function findSimilarFragrances(fragrance, fragrances, limit = 5) {
  return fragrances
    .filter((candidate) => candidate.slug !== fragrance.slug)
    .map((candidate) => ({
      id: candidate.id,
      slug: candidate.slug,
      score: scoreFragranceSimilarity(fragrance, candidate),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function findSimilarMolecules(molecule, molecules, limit = 6) {
  const baseTokens = new Set(
    String(molecule.odor_description || '')
      .split(/[,/]/)
      .map(normalizeText)
      .filter(Boolean),
  );

  return molecules
    .filter((candidate) => candidate.slug !== molecule.slug)
    .map((candidate) => {
      const candidateTokens = new Set(
        String(candidate.odor_description || '')
          .split(/[,/]/)
          .map(normalizeText)
          .filter(Boolean),
      );
      const overlap = [...baseTokens].filter((token) => candidateTokens.has(token)).length;
      return {
        id: candidate.id,
        slug: candidate.slug,
        score: overlap,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function expandFragranceCatalog(fragrances) {
  return fragrances.map((fragrance) => ({
    ...fragrance,
    similar_fragrance_slugs: findSimilarFragrances(fragrance, fragrances).map((entry) => entry.slug),
  }));
}

function expandMoleculeCatalog(molecules) {
  return molecules.map((molecule) => ({
    ...molecule,
    related_molecule_slugs: findSimilarMolecules(molecule, molecules).map((entry) => entry.slug),
  }));
}

async function seedSupabase() {
  loadEnvFile('.env.local');
  loadEnvFile('.env');
  loadEnvFile('.env.production.temp');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase env bulunamadi.');
  }

  const rawFragrances = readJson('fragrances.json');
  const rawMolecules = readJson('molecules.json');
  const noteMap = readJson('note-molecule-map.json');

  const molecules = expandMoleculeCatalog(rawMolecules);
  const moleculeIndex = new Map(molecules.map((item) => [item.slug, item]));
  const expandedFragrances = expandFragranceCatalog(rawFragrances);

  const fragrances = expandedFragrances.map((item) => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    brand: item.brand,
    year: item.year,
    perfumer: item.perfumer,
    concentration: item.concentration,
    gender_profile: item.gender_profile,
    seasons: item.seasons || [],
    occasions: item.occasions || [],
    longevity_score: item.longevity_score ?? null,
    sillage_score: item.sillage_score ?? null,
    price_tier: item.price_tier,
    top_notes: item.top_notes || [],
    heart_notes: item.heart_notes || [],
    base_notes: item.base_notes || [],
    key_molecules: mapNotesToMolecules(
      [
        ...(item.top_notes || []).map((note) => ({ note, role: 'top' })),
        ...(item.heart_notes || []).map((note) => ({ note, role: 'heart' })),
        ...(item.base_notes || []).map((note) => ({ note, role: 'base' })),
      ],
      moleculeIndex,
      noteMap,
    ),
    character_tags: [],
    similar_fragrances: (item.similar_fragrance_slugs || [])
      .map((slug) => expandedFragrances.find((candidate) => candidate.slug === slug)?.id || null)
      .filter(Boolean),
    cover_image_url: item.cover_image_url || null,
    molecule_preview_smiles:
      mapNotesToMolecules(
        [
          ...(item.top_notes || []).map((note) => ({ note, role: 'top' })),
          ...(item.heart_notes || []).map((note) => ({ note, role: 'heart' })),
          ...(item.base_notes || []).map((note) => ({ note, role: 'base' })),
        ],
        moleculeIndex,
        noteMap,
      )[0]?.smiles || null,
    community_votes: { strong: 0, balanced: 0, light: 0 },
  }));

  const moleculeRows = molecules.map((item) => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    iupac_name: item.iupac_name,
    smiles: item.smiles,
    cas_number: item.cas_number,
    odor_description: item.odor_description,
    odor_intensity: item.odor_intensity,
    longevity_contribution: item.longevity_contribution,
    usage_percentage_typical: null,
    found_in_fragrances: [],
    natural_source: item.natural_source,
    discovery_year: item.discovery_year,
    fun_fact: null,
  }));

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const moleculeResult = await supabase.from('molecules').upsert(moleculeRows, { onConflict: 'id' });
  if (moleculeResult.error) {
    throw moleculeResult.error;
  }

  const fragranceResult = await supabase.from('fragrances').upsert(fragrances, { onConflict: 'id' });
  if (fragranceResult.error) {
    throw fragranceResult.error;
  }

  const moleculesWithRefs = moleculeRows.map((item) => ({
    ...item,
    found_in_fragrances: fragrances
      .filter((fragrance) => (fragrance.key_molecules || []).some((molecule) => molecule.id === item.id))
      .map((fragrance) => fragrance.id),
  }));

  const relationResult = await supabase.from('molecules').upsert(moleculesWithRefs, { onConflict: 'id' });
  if (relationResult.error) {
    throw relationResult.error;
  }

  return {
    fragrances: fragrances.length,
    molecules: moleculeRows.length,
  };
}

module.exports = {
  findSimilarFragrances,
  findSimilarMolecules,
  expandFragranceCatalog,
  expandMoleculeCatalog,
  seedSupabase,
};

if (require.main === module) {
  seedSupabase()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
