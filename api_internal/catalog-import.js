const { cleanString, resolveSupabaseConfig } = require('../lib/server/supabase-config');
const { setCorsHeaders, setSecurityHeaders } = require('../lib/server/config');

const MAX_ROWS_PER_REQUEST = 500;

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body && typeof body === 'object' ? body : null;
}

function isAuthorized(req) {
  const enforceAuth = cleanString(process.env.CATALOG_IMPORT_REQUIRE_AUTH).toLowerCase() !== 'false';
  if (!enforceAuth) return true;
  const expected = cleanString(process.env.OPS_PASSWORD);
  if (!expected) return false;
  const provided =
    cleanString(req.headers['x-ops-password']) ||
    cleanString(req.headers['x-catalog-import-key']) ||
    cleanString(req.query?.key);
  return Boolean(provided && provided === expected);
}

function normalizeVotes(input) {
  const base = input && typeof input === 'object' ? input : {};
  const strong = Number.parseInt(base.strong, 10);
  const balanced = Number.parseInt(base.balanced, 10);
  const light = Number.parseInt(base.light, 10);
  return {
    strong: Number.isFinite(strong) ? strong : 0,
    balanced: Number.isFinite(balanced) ? balanced : 0,
    light: Number.isFinite(light) ? light : 0,
  };
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanString(item)).filter(Boolean);
}

function normalizeRow(row) {
  if (!row || typeof row !== 'object') return null;
  const slug = cleanString(row.slug);
  const name = cleanString(row.name);
  if (!slug || !name) return null;

  return {
    slug,
    name,
    brand: cleanString(row.brand) || null,
    year: Number.isFinite(Number(row.year)) ? Number(row.year) : null,
    perfumer: cleanString(row.perfumer) || null,
    concentration: cleanString(row.concentration) || null,
    gender_profile: cleanString(row.gender_profile) || null,
    seasons: normalizeStringArray(row.seasons),
    occasions: normalizeStringArray(row.occasions),
    longevity_score: Number.isFinite(Number(row.longevity_score)) ? Number(row.longevity_score) : null,
    sillage_score: Number.isFinite(Number(row.sillage_score)) ? Number(row.sillage_score) : null,
    price_tier: cleanString(row.price_tier) || null,
    top_notes: normalizeStringArray(row.top_notes),
    heart_notes: normalizeStringArray(row.heart_notes),
    base_notes: normalizeStringArray(row.base_notes),
    key_molecules: Array.isArray(row.key_molecules) ? row.key_molecules : [],
    character_tags: normalizeStringArray(row.character_tags),
    similar_fragrances: Array.isArray(row.similar_fragrances) ? row.similar_fragrances : [],
    cover_image_url: cleanString(row.cover_image_url) || null,
    molecule_preview_smiles: cleanString(row.molecule_preview_smiles) || null,
    community_votes: normalizeVotes(row.community_votes),
  };
}

async function upsertFragranceRows(config, table, rows) {
  const endpoint = `${config.url}/rest/v1/${encodeURIComponent(table)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
      on_conflict: 'slug',
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(cleanString(text) || `supabase_http_${response.status}`);
  }
}

async function clearParfumoRows(config, table) {
  const endpoint = `${config.url}/rest/v1/${encodeURIComponent(table)}?cover_image_url=like.*parfumo.com*`;
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(cleanString(text) || `supabase_http_${response.status}`);
  }
  const deleted = await response.json().catch(() => []);
  return Array.isArray(deleted) ? deleted.length : 0;
}

module.exports = async function catalogImportHandler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res, { methods: 'POST, OPTIONS', headers: 'Content-Type, x-ops-password, x-catalog-import-key' })) {
    return res.status(403).json({ error: 'Bu origin icin erisim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized catalog import request.' });

  const body = parseBody(req);
  const config = resolveSupabaseConfig();
  if (!config.url || !config.serviceRoleKey) {
    return res.status(503).json({ error: 'Supabase service config eksik.' });
  }

  const table = cleanString(process.env.SUPABASE_FRAGRANCES_TABLE) || 'fragrances';

  if (cleanString(body?.operation) === 'clear_parfumo') {
    try {
      const deletedCount = await clearParfumoRows(config, table);
      return res.status(200).json({
        ok: true,
        table,
        operation: 'clear_parfumo',
        deletedCount,
        ts: new Date().toISOString(),
      });
    } catch (error) {
      return res.status(500).json({
        error: 'Parfumo temizligi basarisiz.',
        detail: cleanString(error?.message) || 'unknown',
      });
    }
  }

  if (!body || !Array.isArray(body.rows)) {
    return res.status(400).json({ error: 'rows dizisi gerekli.' });
  }
  if (body.rows.length === 0) return res.status(400).json({ error: 'rows bos olamaz.' });
  if (body.rows.length > MAX_ROWS_PER_REQUEST) {
    return res.status(400).json({ error: `Tek istekte en fazla ${MAX_ROWS_PER_REQUEST} satir kabul edilir.` });
  }
  const rows = body.rows.map(normalizeRow).filter(Boolean);
  if (rows.length === 0) {
    return res.status(400).json({ error: 'Gecerli satir yok. slug ve name zorunlu.' });
  }

  try {
    await upsertFragranceRows(config, table, rows);
    return res.status(200).json({
      ok: true,
      table,
      received: body.rows.length,
      imported: rows.length,
      skipped: body.rows.length - rows.length,
      ts: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Catalog import basarisiz.',
      detail: cleanString(error?.message) || 'unknown',
    });
  }
};
