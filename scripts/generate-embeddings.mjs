import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseBoolean(value, fallback = false) {
  const normalized = cleanString(String(value ?? '')).toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function readEnvFile(filePath) {
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

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanString(String(item))).filter(Boolean);
  }
  const text = cleanString(String(value ?? ''));
  if (!text) return [];
  return text
    .split(/[,;|/]/)
    .map((item) => cleanString(item))
    .filter(Boolean);
}

function unique(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean)));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv) {
  const options = {
    from: 0,
    limit: 0,
    batch: 100,
    sleepMs: 1000,
    dryRun: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--from' && argv[i + 1]) options.from = Math.max(0, Number.parseInt(argv[++i], 10) || 0);
    else if (arg === '--limit' && argv[i + 1]) options.limit = Math.max(0, Number.parseInt(argv[++i], 10) || 0);
    else if (arg === '--batch' && argv[i + 1]) options.batch = Math.max(1, Number.parseInt(argv[++i], 10) || 100);
    else if (arg === '--sleep' && argv[i + 1]) options.sleepMs = Math.max(0, Number.parseInt(argv[++i], 10) || 1000);
    else if (arg === '--dry-run') options.dryRun = true;
  }
  return options;
}

async function embedText(text, apiKey, model) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        content: {
          parts: [{ text: cleanString(text).slice(0, 8000) }],
        },
      }),
    },
  );

  if (!response.ok) {
    const payload = await response.text().catch(() => '');
    throw new Error(payload || `embedding failed (${response.status})`);
  }

  const data = await response.json().catch(() => ({}));
  const values = Array.isArray(data?.embedding?.values) ? data.embedding.values : [];
  if (!values.length) throw new Error('embedding vector bos geldi');
  return values;
}

function buildDocContent(perfume) {
  const name = cleanString(perfume?.name);
  const brand = cleanString(perfume?.brand);
  const top = toStringArray(perfume?.top_notes);
  const heart = toStringArray(perfume?.heart_notes);
  const base = toStringArray(perfume?.base_notes);

  const header = `${name}${brand ? ` - ${brand}` : ''}`;
  return [
    header,
    `Ust notalar: ${top.join(', ') || '-'}`,
    `Kalp notalar: ${heart.join(', ') || '-'}`,
    `Alt notalar: ${base.join(', ') || '-'}`,
  ].join('. ');
}

function buildNotaText(perfume) {
  const top = toStringArray(perfume?.top_notes);
  const heart = toStringArray(perfume?.heart_notes);
  const base = toStringArray(perfume?.base_notes);
  return unique([...top, ...heart, ...base]).join(', ');
}

async function main() {
  readEnvFile(path.resolve(process.cwd(), '.env.local'));
  readEnvFile(path.resolve(process.cwd(), '.env'));

  const args = parseArgs(process.argv);
  const supabaseUrl = cleanString(process.env.SUPABASE_URL) || cleanString(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseKey = cleanString(process.env.SUPABASE_SERVICE_ROLE_KEY) || cleanString(process.env.SUPABASE_SERVICE_KEY);
  const geminiApiKey = cleanString(process.env.GEMINI_API_KEY) || cleanString(process.env.LLM_API_KEY);

  const perfumesTable =
    cleanString(process.env.SUPABASE_PERFUMES_TABLE) ||
    cleanString(process.env.SUPABASE_FRAGRANCES_TABLE) ||
    'fragrances';
  const vectorTable = cleanString(process.env.SUPABASE_VECTOR_TABLE) || 'perfume_docs';
  const model = cleanString(process.env.RAG_EMBEDDING_MODEL) || 'text-embedding-004';

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.');
  }
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY (veya LLM_API_KEY) gerekli.');
  }

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { count: totalCount, error: countError } = await client
    .from(perfumesTable)
    .select('id', { count: 'exact', head: true });
  if (countError) {
    throw new Error(`Toplam kayit okunamadi: ${countError.message}`);
  }

  const total = Number(totalCount || 0);
  const start = args.from;
  const endExclusive = args.limit > 0 ? Math.min(total, start + args.limit) : total;
  if (start >= endExclusive) {
    console.log('[embeddings] Islenecek kayit yok.');
    return;
  }

  console.log(`[embeddings] tablo=${perfumesTable} vector_table=${vectorTable} model=${model}`);
  console.log(`[embeddings] from=${start} to=${endExclusive - 1} batch=${args.batch} dryRun=${args.dryRun}`);

  let processed = 0;
  for (let offset = start; offset < endExclusive; offset += args.batch) {
    const rangeEnd = Math.min(offset + args.batch - 1, endExclusive - 1);
    const { data: rows, error } = await client
      .from(perfumesTable)
      .select('id,name,brand,top_notes,heart_notes,base_notes')
      .range(offset, rangeEnd);

    if (error) {
      throw new Error(`Batch okuma hatasi (${offset}-${rangeEnd}): ${error.message}`);
    }

    const batchRows = Array.isArray(rows) ? rows : [];
    const docs = [];
    for (const row of batchRows) {
      const content = buildDocContent(row);
      const embedding = await embedText(content, geminiApiKey, model);
      docs.push({
        perfume_id: row.id,
        content,
        nota_text: buildNotaText(row),
        family: null,
        metadata: {
          source_table: perfumesTable,
          name: cleanString(row.name),
          brand: cleanString(row.brand),
          top_notes: toStringArray(row.top_notes),
          heart_notes: toStringArray(row.heart_notes),
          base_notes: toStringArray(row.base_notes),
        },
        title: cleanString(row.name),
        name: cleanString(row.name),
        brand: cleanString(row.brand),
        doc_type: 'perfume',
        embedding,
      });
    }

    if (!args.dryRun && docs.length > 0) {
      const { error: upsertError } = await client
        .from(vectorTable)
        .upsert(docs, { onConflict: 'perfume_id' });
      if (upsertError) {
        throw new Error(`Batch upsert hatasi (${offset}-${rangeEnd}): ${upsertError.message}`);
      }
    }

    processed += docs.length;
    console.log(`[embeddings] ${processed}/${endExclusive - start} tamamlandi (range ${offset}-${rangeEnd})`);
    if (offset + args.batch < endExclusive && args.sleepMs > 0) {
      await wait(args.sleepMs);
    }
  }

  if (!args.dryRun && parseBoolean(process.env.RAG_ENABLE_VECTOR, false) === false) {
    console.log('[embeddings] Not: RAG_ENABLE_VECTOR su an false. Uretimden once true yapmayi unutma.');
  }

  console.log(`[embeddings] Bitti. Toplam islenen kayit: ${processed}`);
}

main().catch((error) => {
  console.error(`[embeddings] Hata: ${error?.message || error}`);
  process.exitCode = 1;
});
