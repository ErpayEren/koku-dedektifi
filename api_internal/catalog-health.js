const {
  cleanString,
  resolveSupabaseConfig,
  hasSupabaseServiceConfig,
} = require('../lib/server/supabase-config');
const {
  setCorsHeaders,
  setSecurityHeaders,
} = require('../lib/server/config');
const {
  loadCatalogSeed,
  buildCatalogRecords,
} = require('../lib/server/catalog-seed');

function parseContentRangeTotal(value) {
  const raw = cleanString(value);
  if (!raw.includes('/')) return 0;
  const total = Number.parseInt(raw.split('/').pop() || '0', 10);
  return Number.isFinite(total) ? total : 0;
}

async function countTableRows(config, table) {
  const url = `${config.url}/rest/v1/${encodeURIComponent(table)}?select=id&limit=1`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'count=exact',
      Range: '0-0',
      'Range-Unit': 'items',
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    return {
      ok: false,
      count: 0,
      status: response.status,
      reason: cleanString(body) || `supabase_http_${response.status}`,
    };
  }

  return {
    ok: true,
    count: parseContentRangeTotal(response.headers.get('content-range')),
    status: response.status,
    reason: '',
  };
}

async function handler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res, { methods: 'GET, OPTIONS', headers: 'Content-Type' })) {
    return res.status(403).json({ error: 'Bu origin için erişim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const seed = loadCatalogSeed();
  const seedRecords = buildCatalogRecords(seed);
  const supabase = resolveSupabaseConfig();
  const configured = hasSupabaseServiceConfig();
  const fragranceTable = cleanString(process.env.SUPABASE_FRAGRANCES_TABLE) || 'fragrances';
  const moleculeTable = cleanString(process.env.SUPABASE_MOLECULES_TABLE) || 'molecules';
  const evidenceTable = cleanString(process.env.SUPABASE_FRAGRANCE_MOLECULE_EVIDENCE_TABLE) || 'fragrance_molecule_evidence';
  const databaseUrl =
    cleanString(process.env.SUPABASE_DB_URL)
    || cleanString(process.env.POSTGRES_URL)
    || cleanString(process.env.DATABASE_URL)
    || cleanString(process.env.POSTGRES_PRISMA_URL)
    || cleanString(process.env.POSTGRES_URL_NON_POOLING)
    || cleanString(process.env.SUPABASE_DB_URI);

  let fragranceProbe = { ok: false, count: 0, status: 0, reason: configured ? 'skipped' : 'supabase_missing' };
  let moleculeProbe = { ok: false, count: 0, status: 0, reason: configured ? 'skipped' : 'supabase_missing' };
  let evidenceProbe = { ok: false, count: 0, status: 0, reason: configured ? 'skipped' : 'supabase_missing' };

  if (configured) {
    try {
      [fragranceProbe, moleculeProbe, evidenceProbe] = await Promise.all([
        countTableRows(supabase, fragranceTable),
        countTableRows(supabase, moleculeTable),
        countTableRows(supabase, evidenceTable),
      ]);
    } catch (error) {
      const reason = cleanString(error?.message) || 'catalog_probe_failed';
      fragranceProbe = { ok: false, count: 0, status: 0, reason };
      moleculeProbe = { ok: false, count: 0, status: 0, reason };
      evidenceProbe = { ok: false, count: 0, status: 0, reason };
    }
  }

  const databaseReady =
    configured &&
    fragranceProbe.ok &&
    moleculeProbe.ok &&
    fragranceProbe.count >= 20 &&
    moleculeProbe.count >= 20;
  const evidenceReady = evidenceProbe.ok && evidenceProbe.count > 0;
  const fallbackReady =
    seedRecords.fragrances.length >= 20 &&
    seedRecords.molecules.length >= 20 &&
    Array.isArray(seedRecords.relations) &&
    seedRecords.relations.length > 0;

  return res.status(200).json({
    ok: true,
    ready: databaseReady || fallbackReady,
    source: databaseReady ? 'supabase' : 'fallback-seed',
    checks: {
      supabaseConfigured: configured,
      runtimeHasServiceRoleKey: Boolean(cleanString(supabase.serviceRoleKey)),
      runtimeHasDatabaseUrl: Boolean(databaseUrl),
      fragranceTable,
      moleculeTable,
      evidenceTable,
      seedFragranceCount: seedRecords.fragrances.length,
      seedMoleculeCount: seedRecords.molecules.length,
      seedEvidenceRelationCount: Array.isArray(seedRecords.relations) ? seedRecords.relations.length : 0,
      seedVisibleMoleculeCount: seedRecords.stats?.visibleMoleculeCount || 0,
      seedHiddenZeroLinkCount: seedRecords.stats?.zeroLinkHiddenCount || 0,
      databaseFragranceCount: fragranceProbe.count,
      databaseMoleculeCount: moleculeProbe.count,
      databaseEvidenceRelationCount: evidenceProbe.count,
      databaseProbeOk: fragranceProbe.ok && moleculeProbe.ok,
      evidenceProbeOk: evidenceProbe.ok,
      evidenceReady,
      fragranceProbeReason: fragranceProbe.reason,
      moleculeProbeReason: moleculeProbe.reason,
      evidenceProbeReason: evidenceProbe.reason,
      urlHost: cleanString(supabase.url).replace(/^https?:\/\//i, ''),
    },
    ts: new Date().toISOString(),
  });
}

module.exports = handler;
