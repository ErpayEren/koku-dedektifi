import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

type CsvRow = Record<string, string>;

type PerfumeRecord = {
  slug: string;
  name: string;
  brand: string | null;
  year: number | null;
  perfumer: string | null;
  concentration: string | null;
  gender_profile: string | null;
  seasons: string[];
  occasions: string[];
  longevity_score: number | null;
  sillage_score: number | null;
  price_tier: string | null;
  top_notes: string[];
  heart_notes: string[];
  base_notes: string[];
  key_molecules: Array<Record<string, unknown>>;
  character_tags: string[];
  similar_fragrances: string[];
  cover_image_url: string | null;
  molecule_preview_smiles: string | null;
  community_votes: { strong: number; balanced: number; light: number };
};

const BATCH_SIZE = 100;

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseCsv(raw: string): CsvRow[] {
  const rows: string[][] = [];
  let cell = '';
  let row: string[] = [];
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
    const obj: CsvRow = {};
    headers.forEach((header, idx) => {
      obj[header] = clean(r[idx] ?? '');
    });
    obj.__row_index = String(rowIndex + 1);
    return obj;
  });
}

function parseNotes(value: string): string[] {
  const text = clean(value);
  if (!text || text.toLowerCase() === 'na' || text.toLowerCase() === 'n/a') return [];
  return text
    .split(/[,;|/]/)
    .map((item) => clean(item))
    .filter(Boolean);
}

function toNullableNumber(value: string): number | null {
  if (clean(value).toLowerCase() === 'na') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function slugify(value: string): string {
  return clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function parseCommunityVotes(ratingValueRaw: string, ratingCountRaw: string): { strong: number; balanced: number; light: number } {
  const ratingValue = toNullableNumber(ratingValueRaw);
  const ratingCount = toNullableNumber(ratingCountRaw);
  const baseCount = Number.isFinite(ratingCount) && (ratingCount as number) > 0 ? Math.floor(ratingCount as number) : 0;
  const strength = Number.isFinite(ratingValue) ? (ratingValue as number) : 0;

  if (!baseCount) return { strong: 0, balanced: 0, light: 0 };
  if (strength >= 7.5) {
    return {
      strong: Math.floor(baseCount * 0.55),
      balanced: Math.floor(baseCount * 0.3),
      light: Math.floor(baseCount * 0.15),
    };
  }
  if (strength >= 6.0) {
    return {
      strong: Math.floor(baseCount * 0.35),
      balanced: Math.floor(baseCount * 0.45),
      light: Math.floor(baseCount * 0.2),
    };
  }
  return {
    strong: Math.floor(baseCount * 0.2),
    balanced: Math.floor(baseCount * 0.4),
    light: Math.floor(baseCount * 0.4),
  };
}

function buildPerfumeRow(row: CsvRow): PerfumeRecord | null {
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
  const topNotes = parseNotes(row.Top_Notes || row.top_notes || '');
  const heartNotes = parseNotes(row.Middle_Notes || row.heart_notes || row.Heart_Notes || '');
  const baseNotes = parseNotes(row.Base_Notes || row.base_notes || '');
  const accords = parseNotes(row.Main_Accords || row.accords || '');
  const concentrationRaw = clean(row.Concentration || row.concentration);

  return {
    slug,
    name,
    brand: brand || null,
    year: toNullableNumber(row.Release_Year || row.year || ''),
    perfumer: clean(row.Perfumers || row.Perfumer || row.perfumer) || null,
    concentration: concentrationRaw && concentrationRaw.toLowerCase() !== 'na' ? concentrationRaw : null,
    gender_profile: clean(row.Gender || row.gender) || null,
    seasons: [],
    occasions: [],
    longevity_score: null,
    sillage_score: null,
    price_tier: null,
    top_notes: topNotes,
    heart_notes: heartNotes,
    base_notes: baseNotes,
    key_molecules: [],
    character_tags: accords,
    similar_fragrances: [],
    cover_image_url: clean(row.URL || row.url) || null,
    molecule_preview_smiles: null,
    community_votes: parseCommunityVotes(row.Rating_Value || row.rating || '', row.Rating_Count || row.rating_count || ''),
  };
}

async function importParfumo(csvPath: string): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
  const table = process.env.SUPABASE_FRAGRANCES_TABLE || process.env.SUPABASE_PERFUMES_TABLE || 'fragrances';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase credentials eksik. SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY tanimli olmali.');
  }

  const absPath = path.resolve(process.cwd(), csvPath);
  const csvRaw = fs.readFileSync(absPath, 'utf-8');
  const rows = parseCsv(csvRaw);
  const perfumes = rows.map(buildPerfumeRow).filter((row): row is PerfumeRecord => Boolean(row));

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  for (let i = 0; i < perfumes.length; i += BATCH_SIZE) {
    const chunk = perfumes.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict: 'slug' });
    if (error) {
      throw new Error(`Batch ${i / BATCH_SIZE + 1} import hatasi: ${error.message}`);
    }
    process.stdout.write(`\rImport ${Math.min(i + BATCH_SIZE, perfumes.length)}/${perfumes.length}`);
  }

  process.stdout.write('\n');
  console.log(`Parfumo import tamamlandi. Toplam parfum: ${perfumes.length}`);
}

if (require.main === module) {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Kullanim: node scripts/import-parfumo.ts <csv-path>');
    process.exit(1);
  }
  importParfumo(fileArg).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { importParfumo };
