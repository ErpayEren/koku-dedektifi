import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_ENDPOINT = 'https://koku-dedektifi.vercel.app/api/ops?r=catalog-import';
const BATCH_SIZE = 250;
const RETRY_COUNT = 3;

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function readEnvValueFromFile(filePath, key) {
  if (!fs.existsSync(filePath)) return '';
  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    if (!line.startsWith(`${key}=`)) continue;
    const raw = line.slice(key.length + 1).trim();
    if (!raw) return '';
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      return raw.slice(1, -1);
    }
    return raw;
  }
  return '';
}

function parseCsv(raw) {
  const rows = [];
  let cell = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    const next = raw[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(cell);
      cell = '';
      if (row.some((entry) => entry !== '')) rows.push(row);
      row = [];
      continue;
    }

    cell += ch;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => clean(h));
  return rows.slice(1).map((r, rowIndex) => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = clean(r[idx] ?? '');
    });
    obj.__row_index = String(rowIndex + 1);
    return obj;
  });
}

function parseNotes(value) {
  const text = clean(value);
  if (!text || text.toLowerCase() === 'na' || text.toLowerCase() === 'n/a') return [];
  return text
    .split(/[,;|/]/)
    .map((item) => clean(item))
    .filter(Boolean);
}

function toNullableNumber(value) {
  if (clean(value).toLowerCase() === 'na') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function slugify(value) {
  return clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function parseCommunityVotes(ratingValueRaw, ratingCountRaw) {
  const ratingValue = toNullableNumber(ratingValueRaw);
  const ratingCount = toNullableNumber(ratingCountRaw);
  const baseCount = Number.isFinite(ratingCount) && ratingCount > 0 ? Math.floor(ratingCount) : 0;
  const strength = Number.isFinite(ratingValue) ? ratingValue : 0;

  if (!baseCount) return { strong: 0, balanced: 0, light: 0 };
  if (strength >= 7.5) return { strong: Math.floor(baseCount * 0.55), balanced: Math.floor(baseCount * 0.3), light: Math.floor(baseCount * 0.15) };
  if (strength >= 6.0) return { strong: Math.floor(baseCount * 0.35), balanced: Math.floor(baseCount * 0.45), light: Math.floor(baseCount * 0.2) };
  return { strong: Math.floor(baseCount * 0.2), balanced: Math.floor(baseCount * 0.4), light: Math.floor(baseCount * 0.4) };
}

function buildFragranceRow(row) {
  const name = clean(row.Name || row.Perfume || row.name);
  if (!name) return null;
  const brand = clean(row.Brand || row.brand);
  const rawNumber = clean(row.Number || row.number || row.ID || row.id);
  const numberSuffix = slugify(rawNumber).slice(0, 20);
  const rowSuffix = slugify(row.__row_index || '').slice(0, 20);
  const urlRaw = clean(row.URL || row.url);
  const urlTail = slugify(urlRaw.split('/').filter(Boolean).pop() || '').slice(0, 40);
  const baseSlug = [slugify(brand), slugify(name)].filter(Boolean).join('-') || slugify(name);
  const slugParts = [baseSlug, numberSuffix, urlTail, rowSuffix].filter(Boolean);
  const slug = slugParts.join('-').slice(0, 180);
  const concentrationRaw = clean(row.Concentration || row.concentration);

  return {
    slug,
    name,
    brand: brand || null,
    year: toNullableNumber(row.Release_Year || row.year),
    perfumer: clean(row.Perfumers || row.Perfumer || row.perfumer) || null,
    concentration: concentrationRaw && concentrationRaw.toLowerCase() !== 'na' ? concentrationRaw : null,
    gender_profile: clean(row.Gender || row.gender) || null,
    seasons: [],
    occasions: [],
    longevity_score: null,
    sillage_score: null,
    price_tier: null,
    top_notes: parseNotes(row.Top_Notes || row.top_notes || ''),
    heart_notes: parseNotes(row.Middle_Notes || row.heart_notes || row.Heart_Notes || ''),
    base_notes: parseNotes(row.Base_Notes || row.base_notes || ''),
    key_molecules: [],
    character_tags: parseNotes(row.Main_Accords || row.accords || ''),
    similar_fragrances: [],
    cover_image_url: clean(row.URL || row.url) || null,
    molecule_preview_smiles: null,
    community_votes: parseCommunityVotes(row.Rating_Value || row.rating || '', row.Rating_Count || row.rating_count || ''),
  };
}

async function postChunk(endpoint, apiKey, chunk, attempt = 1) {
  const url = new URL(endpoint);
  if (!url.searchParams.get('key')) {
    url.searchParams.set('key', apiKey);
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-ops-password': apiKey,
      'x-catalog-import-key': apiKey,
    },
    body: JSON.stringify({ rows: chunk }),
  });

  const payload = await response.json().catch(() => ({}));
  if (response.ok) return payload;

  if (attempt < RETRY_COUNT) {
    await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    return postChunk(endpoint, apiKey, chunk, attempt + 1);
  }

  throw new Error(`Chunk import failed (status=${response.status}): ${JSON.stringify(payload)}`);
}

export async function remoteImportParfumo(csvPath, endpoint = DEFAULT_ENDPOINT) {
  const apiKey = clean(process.env.OPS_PASSWORD) || readEnvValueFromFile(path.resolve(process.cwd(), '.env.local'), 'OPS_PASSWORD');
  if (!apiKey) {
    throw new Error('OPS_PASSWORD env gerekli. vercel env pull ile production env al ve tekrar dene.');
  }

  const absPath = path.resolve(process.cwd(), csvPath);
  const csvRaw = fs.readFileSync(absPath, 'utf-8');
  const records = parseCsv(csvRaw).map(buildFragranceRow).filter(Boolean);
  const total = records.length;
  let imported = 0;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE);
    await postChunk(endpoint, apiKey, chunk);
    imported += chunk.length;
    process.stdout.write(`\rRemote import ${imported}/${total}`);
  }

  process.stdout.write('\n');
  console.log(`Remote Parfumo import tamamlandi. Toplam parfum: ${total}`);
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  const fileArg = process.argv[2];
  const endpointArg = process.argv[3] || DEFAULT_ENDPOINT;
  if (!fileArg) {
    console.error('Kullanim: node scripts/remote-import-parfumo.mjs <csv-path> [endpoint]');
    process.exit(1);
  }
  remoteImportParfumo(fileArg, endpointArg).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
