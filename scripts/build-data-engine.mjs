import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const SOURCE_URLS = {
  perfumeCsv:
    'https://raw.githubusercontent.com/sir-omoreno/perfume_designer_app/main/perfume_data_combined.csv',
  goodscents:
    'https://raw.githubusercontent.com/pyrfume/pyrfume-data/main/goodscents/molecules.csv',
  fragrancedb:
    'https://raw.githubusercontent.com/pyrfume/pyrfume-data/main/fragrancedb/molecules.csv',
  leffingwell:
    'https://raw.githubusercontent.com/pyrfume/pyrfume-data/main/leffingwell/molecules.csv',
  ifraGlossary:
    'https://raw.githubusercontent.com/pyrfume/pyrfume-data/main/ifra_2019/ifra-fragrance-ingredient-glossary---oct-2019.csv',
  perfumenukeMaterials:
    'https://raw.githubusercontent.com/nuke-haus/perfumenuke/main/data/materials.json',
};

const MUST_HAVE_FRAGRANCES = [
  ['Chanel', 'No.5'],
  ['Creed', 'Aventus'],
  ['Dior', 'Sauvage'],
  ['Tom Ford', 'Black Orchid'],
  ['Yves Saint Laurent', 'Black Opium'],
  ['Maison Margiela', 'Replica Jazz Club'],
  ['Byredo', 'Gypsy Water'],
  ['Giorgio Armani', 'Acqua di Gio Profondo'],
  ['Amouage', 'Interlude Man'],
  ['Narciso Rodriguez', 'For Her'],
  ['Jo Malone London', 'Wood Sage & Sea Salt'],
  ['Frederic Malle', 'Portrait of a Lady'],
  ['Guerlain', 'Shalimar'],
  ['Thierry Mugler', 'Angel'],
  ['Viktor&Rolf', 'Flowerbomb'],
  ['Parfums de Marly', 'Layton'],
  ['Initio Parfums', 'Oud for Greatness'],
  ['Xerjoff', 'Naxos'],
  ['Atelier Cologne', 'Orange Sanguine'],
  ['Memo Paris', 'African Leather'],
];

const NOTE_MOLECULE_MAP = {
  rose: ['geraniol', 'citronellol', 'phenylethanol', 'rose-oxide', 'damascenone'],
  citrus: ['limonene', 'citral', 'linalool', 'nootkatone'],
  bergamot: ['limonene', 'linalyl-acetate', 'citral'],
  orange: ['limonene', 'citral', 'nootkatone'],
  grapefruit: ['nootkatone', 'limonene', 'citral'],
  woody: ['iso-e-super', 'cedramber', 'cedrene', 'ambroxide'],
  cedar: ['cedrene', 'cedrol', 'iso-e-super'],
  sandalwood: ['alpha-santalol', 'iso-e-super', 'javanol'],
  vanilla: ['vanillin', 'ethyl-vanillin', 'coumarin'],
  musk: ['galaxolide', 'ambrettolide', 'muscone'],
  jasmine: ['hedione', 'benzyl-acetate', 'indole'],
  lavender: ['linalool', 'linalyl-acetate', 'lavandulol'],
  iris: ['irone', 'ionone'],
  violet: ['ionone', 'irone'],
  patchouli: ['patchouli-alcohol'],
  amber: ['ambroxide', 'ambrettolide', 'cashmeran'],
  oud: ['ambroxide', 'cedramber', 'patchouli-alcohol'],
  saffron: ['safranal'],
  leather: ['safranal', 'birch-tar', 'isobutyl-quinoline'],
  tobacco: ['coumarin', 'guaiacol', '2-acetylpyrazine'],
  coffee: ['2-acetylpyrazine', 'guaiacol'],
  marine: ['calone', 'ambroxide'],
  aquatic: ['calone', 'ambroxide'],
  green: ['cis-3-hexenol', 'galbanol'],
  apple: ['hexenyl-acetate', 'hexyl-acetate'],
  pineapple: ['ethyl-butyrate', 'allyl-hexanoate', 'nootkatone'],
  coconut: ['gamma-nonalactone', 'delta-decalactone'],
  tonka: ['coumarin', 'vanillin'],
  incense: ['guaiacol', 'olibanol', 'incense-acetate'],
  neroli: ['linalool', 'linalyl-acetate', 'benzyl-acetate'],
  orange_blossom: ['linalool', 'benzyl-acetate', 'indole'],
};

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'KokuDedektifi/1.0' } }, (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`HTTP ${response.statusCode} for ${url}`));
          return;
        }
        let raw = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          raw += chunk;
        });
        response.on('end', () => resolve(raw));
      })
      .on('error', reject);
  });
}

function parseCsv(text) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(current);
      current = '';
      if (row.some((cell) => cell !== '')) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    current += char;
  }

  if (current.length || row.length) {
    row.push(current);
    rows.push(row);
  }

  if (!rows.length) return [];
  const headers = rows[0].map((cell) => cell.trim());
  return rows.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, headerIndex) => {
      record[header] = (cells[headerIndex] || '').trim();
    });
    return record;
  });
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

function stableUuid(seed) {
  const hash = crypto.createHash('md5').update(seed).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function parsePythonList(value) {
  const source = String(value || '').trim();
  if (!source || source === '[]') return [];
  const items = [];
  const regex = /'([^']+)'/g;
  let match = regex.exec(source);
  while (match) {
    items.push(match[1].trim());
    match = regex.exec(source);
  }
  return items;
}

function parsePythonDict(value) {
  const source = String(value || '').trim();
  if (!source || source === '{}' || source === 'None') return {};
  const result = {};
  const regex = /'([^']+)':\s*([0-9.]+)/g;
  let match = regex.exec(source);
  while (match) {
    result[match[1].trim()] = Number(match[2]);
    match = regex.exec(source);
  }
  return result;
}

function weightedTenScale(votes, weights) {
  const entries = Object.entries(votes);
  if (!entries.length) return null;
  let totalVotes = 0;
  let weighted = 0;
  for (const [label, count] of entries) {
    const numericCount = Number(count || 0);
    if (!numericCount) continue;
    totalVotes += numericCount;
    weighted += numericCount * (weights[label] || 0);
  }
  if (!totalVotes) return null;
  return Math.max(1, Math.min(10, Math.round((weighted / totalVotes) * 2)));
}

function parsePerfumer(description) {
  const text = String(description || '');
  const createdBy = text.match(/was created by ([^.]+)\./i);
  if (createdBy?.[1]) return createdBy[1].trim();
  const nose = text.match(/The nose behind this fragrance is ([^.]+)\./i);
  if (nose?.[1]) return nose[1].trim();
  return null;
}

function parseYear(description) {
  const match = String(description || '').match(/launched in (\d{4})/i);
  return match ? Number(match[1]) : null;
}

function parseConcentration(name) {
  const text = String(name || '').toLowerCase();
  if (text.includes('extrait')) return 'Extrait';
  if (text.includes('parfum')) return 'Parfum';
  if (text.includes('eau de parfum') || text.includes('edp')) return 'Eau de Parfum';
  if (text.includes('eau de toilette') || text.includes('edt')) return 'Eau de Toilette';
  if (text.includes('cologne')) return 'Cologne';
  return null;
}

function mapGenderProfile(forGender) {
  const text = normalizeText(forGender);
  if (text.includes('women and men') || text.includes('men and women')) return 'unisex';
  if (text.includes('men')) return 'masculine';
  if (text.includes('women')) return 'feminine';
  return null;
}

function rankFragranceRow(row) {
  const votes = Number(row.number_votes || 0);
  const rating = Number(row.rating || 0);
  const accordsCount = Object.keys(parsePythonDict(row['main accords'])).length;
  const noteCount =
    parsePythonList(row['top notes']).length +
    parsePythonList(row['middle notes']).length +
    parsePythonList(row['base notes']).length;
  return votes * 10 + rating * 100 + accordsCount * 2 + noteCount;
}

function buildFragranceFromSeed(seedItem) {
  return {
    id: seedItem.id,
    slug: seedItem.slug,
    name: seedItem.name,
    brand: seedItem.brand || null,
    year: seedItem.year || null,
    concentration: seedItem.concentration || null,
    perfumer: seedItem.perfumer || null,
    top_notes: seedItem.top_notes || [],
    heart_notes: seedItem.heart_notes || [],
    base_notes: seedItem.base_notes || [],
    seasons: seedItem.seasons || [],
    occasions: seedItem.occasions || [],
    gender_profile: seedItem.gender_profile || null,
    price_tier: seedItem.price_tier || null,
    cover_image_url: seedItem.cover_image_url || null,
    source: 'local-curated-seed',
  };
}

function buildFragranceFromRemote(row) {
  const brand = String(row.company || '').replace(/^By\s+/i, '').trim() || null;
  const name = String(row.name || '').trim();
  const slug = slugify(`${brand || 'unknown'} ${name}`);
  return {
    id: stableUuid(`fragrance:${slug}`),
    slug,
    name,
    brand,
    year: parseYear(row.description),
    concentration: parseConcentration(name),
    perfumer: parsePerfumer(row.description),
    top_notes: parsePythonList(row['top notes']),
    heart_notes: parsePythonList(row['middle notes']),
    base_notes: parsePythonList(row['base notes']),
    seasons: [],
    occasions: [],
    gender_profile: mapGenderProfile(row.for_gender),
    price_tier: null,
    cover_image_url: row.image || null,
    source: 'perfume-designer-app',
    _rank: rankFragranceRow(row),
    _longevityVotes: parsePythonDict(row.longevity),
    _sillageVotes: parsePythonDict(row.sillage),
  };
}

function pickTopFragrances(localSeed, perfumeRows) {
  const selected = [];
  const seen = new Set();

  for (const item of localSeed.fragrances.map(buildFragranceFromSeed)) {
    const key = normalizeText(`${item.brand || ''} ${item.name}`);
    seen.add(key);
    selected.push(item);
  }

  const remoteItems = perfumeRows
    .map(buildFragranceFromRemote)
    .filter((item) => item.name && (item.top_notes.length || item.heart_notes.length || item.base_notes.length))
    .sort((left, right) => right._rank - left._rank);

  for (const item of remoteItems) {
    const key = normalizeText(`${item.brand || ''} ${item.name}`);
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(item);
    if (selected.length >= 100) break;
  }

  return selected.slice(0, 100).map((item) => {
    const longevityScore =
      item._longevityVotes &&
      weightedTenScale(item._longevityVotes, {
        'very weak': 1,
        weak: 2,
        moderate: 3,
        'long lasting': 4,
        eternal: 5,
      });
    const sillageScore =
      item._sillageVotes &&
      weightedTenScale(item._sillageVotes, {
        intimate: 1,
        moderate: 2,
        strong: 4,
        enormous: 5,
      });
    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      brand: item.brand,
      year: item.year,
      concentration: item.concentration,
      perfumer: item.perfumer,
      top_notes: item.top_notes,
      heart_notes: item.heart_notes,
      base_notes: item.base_notes,
      seasons: item.seasons,
      occasions: item.occasions,
      gender_profile: item.gender_profile,
      price_tier: item.price_tier,
      cover_image_url: item.cover_image_url,
      longevity_score: longevityScore ?? null,
      sillage_score: sillageScore ?? null,
      source: item.source,
    };
  });
}

function chooseBetterMoleculeRecord(a, b) {
  const score = (record) =>
    ['iupac_name', 'smiles', 'cas_number', 'odor_description', 'natural_source', 'discovery_year']
      .map((key) => (record[key] ? 1 : 0))
      .reduce((sum, value) => sum + value, 0);
  return score(b) > score(a) ? b : a;
}

function buildMoleculeSeed(localSeed, structureRows, glossaryRows, perfumenukeMaterials) {
  const glossaryByName = new Map();
  glossaryRows.forEach((row) => {
    const name = row['Principal name'] || '';
    const key = normalizeText(name);
    if (!key) return;
    glossaryByName.set(key, row);
  });

  const materialByName = new Map();
  perfumenukeMaterials
    .filter((item) => item && item.name && !item.is_solvent && item.name !== 'Unknown Material')
    .forEach((item) => {
      materialByName.set(normalizeText(item.name), item);
    });

  const resultMap = new Map();

  function upsert(record) {
    if (!record?.name || !record?.smiles) return;
    const key = record.slug || slugify(record.name);
    const existing = resultMap.get(key);
    resultMap.set(key, existing ? chooseBetterMoleculeRecord(existing, record) : record);
  }

  for (const item of localSeed.molecules) {
    upsert({
      id: item.id,
      slug: item.slug,
      name: item.name,
      iupac_name: item.iupac_name || null,
      smiles: item.smiles,
      cas_number: item.cas_number || null,
      odor_description: item.odor_description || null,
      odor_intensity: item.odor_intensity || null,
      longevity_contribution: item.longevity_contribution || null,
      natural_source: item.natural_source || null,
      discovery_year: item.discovery_year || null,
      source: 'local-curated-seed',
    });
  }

  for (const row of structureRows) {
    const name = row.name || row.PrincipalName || '';
    const normalizedName = normalizeText(name);
    if (!normalizedName || !row.IsomericSMILES) continue;
    const glossary = glossaryByName.get(normalizedName);
    const material = materialByName.get(normalizedName);
    if (!glossary && !material) continue;
    const descriptors = glossary
      ? [glossary['Primary descriptor'], glossary['Descriptor 2'], glossary['Descriptor 3']]
          .map((value) => String(value || '').trim())
          .filter(Boolean)
      : [];
    const odorDescription = descriptors.length
      ? descriptors.join(', ').toLowerCase()
      : material?.scent
        ? String(material.scent).trim()
        : null;
    upsert({
      id: stableUuid(`molecule:${slugify(name)}`),
      slug: slugify(name),
      name: String(name).trim(),
      iupac_name: row.IUPACName || null,
      smiles: row.IsomericSMILES,
      cas_number: glossary?.['CAS number'] || material?.cas || null,
      odor_description: odorDescription,
      odor_intensity: null,
      longevity_contribution: null,
      natural_source: material?.is_natural ? 'natural-source' : null,
      discovery_year: null,
      source: glossary ? 'ifra+structure-match' : 'perfumenuke+structure-match',
    });
  }

  const molecules = Array.from(resultMap.values()).sort((left, right) => left.name.localeCompare(right.name));
  return molecules.slice(0, Math.max(550, molecules.length));
}

function parseStructureRows(...datasets) {
  const rows = [];
  for (const dataset of datasets) {
    dataset.forEach((row) => {
      const name = row.name || '';
      const smiles = row.IsomericSMILES || '';
      if (!name || !smiles) return;
      rows.push({
        name,
        IsomericSMILES: smiles,
        IUPACName: row.IUPACName || '',
      });
    });
  }
  return rows;
}

function buildRelatedFragranceSlugs(fragrances) {
  const noteSets = new Map(
    fragrances.map((item) => [
      item.slug,
      new Set(
        [...item.top_notes, ...item.heart_notes, ...item.base_notes].map((note) => normalizeText(note)).filter(Boolean),
      ),
    ]),
  );

  return fragrances.map((fragrance) => {
    const current = noteSets.get(fragrance.slug) || new Set();
    const scored = fragrances
      .filter((candidate) => candidate.slug !== fragrance.slug)
      .map((candidate) => {
        const other = noteSets.get(candidate.slug) || new Set();
        const intersection = [...current].filter((value) => other.has(value)).length;
        const union = new Set([...current, ...other]).size || 1;
        return { slug: candidate.slug, score: intersection / union };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 5)
      .map((entry) => entry.slug);
    return {
      ...fragrance,
      similar_fragrance_slugs: scored,
    };
  });
}

async function main() {
  const [perfumeCsv, goodscentsCsv, fragrancedbCsv, leffingwellCsv, ifraGlossaryCsv, perfumenukeJson] =
    await Promise.all(
      Object.values(SOURCE_URLS).map((url) => fetchText(url)),
    );

  const localSeed = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'catalog-seed.json'), 'utf8'));
  const perfumeRows = parseCsv(perfumeCsv);
  const goodscentsRows = parseCsv(goodscentsCsv);
  const fragrancedbRows = parseCsv(fragrancedbCsv);
  const leffingwellRows = parseCsv(leffingwellCsv);
  const glossaryRows = parseCsv(ifraGlossaryCsv);
  const perfumenukeMaterials = JSON.parse(perfumenukeJson).materials || [];

  const fragrances = buildRelatedFragranceSlugs(pickTopFragrances(localSeed, perfumeRows));
  const molecules = buildMoleculeSeed(
    localSeed,
    parseStructureRows(goodscentsRows, fragrancedbRows, leffingwellRows),
    glossaryRows,
    perfumenukeMaterials,
  );

  if (fragrances.length < 100) {
    throw new Error(`Fragrance dataset eksik uretildi: ${fragrances.length}`);
  }
  if (molecules.length < 500) {
    throw new Error(`Molecule dataset eksik uretildi: ${molecules.length}`);
  }

  fs.writeFileSync(path.join(rootDir, 'fragrances.json'), `${JSON.stringify(fragrances, null, 2)}\n`);
  fs.writeFileSync(path.join(rootDir, 'molecules.json'), `${JSON.stringify(molecules, null, 2)}\n`);
  fs.writeFileSync(path.join(rootDir, 'note-molecule-map.json'), `${JSON.stringify(NOTE_MOLECULE_MAP, null, 2)}\n`);

  const mustHaveCoverage = MUST_HAVE_FRAGRANCES.filter(([brand, name]) =>
    fragrances.some((item) => item.brand === brand && item.name === name),
  ).length;

  console.log(
    JSON.stringify(
      {
        fragranceCount: fragrances.length,
        moleculeCount: molecules.length,
        mustHaveCoverage,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
