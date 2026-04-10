/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toUrlBase(raw) {
  const cleaned = cleanString(raw).replace(/\/+$/, '');
  if (!cleaned) return '';
  return /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
}

function parseArgs(argv) {
  const out = {
    source: path.resolve(__dirname, '..', 'docs', 'perfume_docs_seed.json'),
    from: 0,
    limit: 0,
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--source' && argv[i + 1]) out.source = path.resolve(argv[++i]);
    else if (arg === '--from' && argv[i + 1]) out.from = Math.max(0, Number.parseInt(argv[++i], 10) || 0);
    else if (arg === '--limit' && argv[i + 1]) out.limit = Math.max(0, Number.parseInt(argv[++i], 10) || 0);
    else if (arg === '--dry-run') out.dryRun = true;
  }
  return out;
}

function normalizeEmbeddingVector(values, expectedDim) {
  if (!Array.isArray(values) || values.length === 0) return [];
  if (values.length === expectedDim) return values;
  if (values.length > expectedDim) return values.slice(0, expectedDim);
  throw new Error(`embedding vector boyutu kucuk: ${values.length} < ${expectedDim}`);
}

async function embedText(text, apiKey, model) {
  const outputDimensionality = Math.max(
    1,
    Number.parseInt(cleanString(process.env.RAG_EMBEDDING_DIM) || '768', 10) || 768,
  );
  const candidates = Array.from(
    new Set([model, 'gemini-embedding-001', 'gemini-embedding-2-preview'].map((item) => cleanString(item)).filter(Boolean)),
  );

  let lastError = null;
  for (const candidate of candidates) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidate)}:embedContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          content: { parts: [{ text: cleanString(text).slice(0, 8000) }] },
          outputDimensionality,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      lastError = new Error(body || `embedding failed (${response.status})`);
      if (response.status === 404 || response.status === 400) continue;
      throw lastError;
    }

    const data = await response.json();
    const rawVector = Array.isArray(data?.embedding?.values) ? data.embedding.values : [];
    const vector = normalizeEmbeddingVector(rawVector, outputDimensionality);
    if (vector.length) return vector;
    lastError = new Error(`embedding vector is empty (${candidate})`);
  }

  throw lastError || new Error('embedding failed');
}

async function upsertSupabaseRow(baseUrl, key, table, row) {
  const response = await fetch(`${baseUrl}/rest/v1/${encodeURIComponent(table)}?on_conflict=external_id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify([row]),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || `supabase upsert failed (${response.status})`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const sourcePath = args.source;
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Seed dosyasi bulunamadi: ${sourcePath}`);
  }

  const supabaseUrl = toUrlBase(process.env.SUPABASE_URL);
  const supabaseKey = cleanString(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const geminiApiKey = cleanString(process.env.GEMINI_API_KEY) || cleanString(process.env.LLM_API_KEY);
  const embeddingModel = cleanString(process.env.RAG_EMBEDDING_MODEL) || 'gemini-embedding-001';
  const table = cleanString(process.env.SUPABASE_VECTOR_TABLE) || 'perfume_docs';

  if (!supabaseUrl || !supabaseKey) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY gerekli');
  if (!geminiApiKey) throw new Error('GEMINI_API_KEY veya LLM_API_KEY gerekli');

  const raw = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const docs = Array.isArray(raw?.docs) ? raw.docs : [];
  const sliced = args.limit > 0
    ? docs.slice(args.from, args.from + args.limit)
    : docs.slice(args.from);

  if (!sliced.length) {
    console.log('[seed-vector] islenecek dokuman bulunamadi.');
    return;
  }

  console.log(`[seed-vector] source=${sourcePath}`);
  console.log(`[seed-vector] docs=${sliced.length} from=${args.from} limit=${args.limit || 'all'} dryRun=${args.dryRun ? 'yes' : 'no'}`);

  let success = 0;
  for (let i = 0; i < sliced.length; i += 1) {
    const doc = sliced[i];
    const text = cleanString(doc?.content);
    if (!text || !cleanString(doc?.title)) continue;

    process.stdout.write(`[seed-vector] ${i + 1}/${sliced.length} ${doc.title} ... `);
    const embedding = await embedText(text, geminiApiKey, embeddingModel);
    if (!args.dryRun) {
      await upsertSupabaseRow(supabaseUrl, supabaseKey, table, {
        external_id: cleanString(doc.id) || `doc-${args.from + i + 1}`,
        doc_type: cleanString(doc.type) || 'perfume',
        title: cleanString(doc.title),
        content: text,
        family: cleanString(doc.family),
        occasion: cleanString(doc.occasion),
        url: cleanString(doc.url),
        embedding,
      });
    }
    success += 1;
    process.stdout.write('ok\n');
  }

  console.log(`[seed-vector] tamamlandi. basarili dokuman: ${success}`);
}

main().catch((error) => {
  console.error(`[seed-vector] hata: ${error?.message || error}`);
  process.exitCode = 1;
});
