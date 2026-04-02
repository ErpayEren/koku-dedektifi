const {
  cleanString,
  resolveSupabaseConfig,
} = require('../lib/server/supabase-config');
const {
  setCorsHeaders,
  setSecurityHeaders,
} = require('../lib/server/config');
const { seedCatalog } = require('../lib/server/catalog-seed');

function isAuthorized(req) {
  const expected = cleanString(process.env.METRICS_API_KEY || process.env.OPS_PASSWORD);
  if (!expected) return false;
  const fromHeader = cleanString(req.headers['x-metrics-key'] || req.headers['x-ops-key']);
  const fromQuery = cleanString(req.query?.key || req.query?.token);
  const provided = fromHeader || fromQuery;
  return Boolean(provided && provided === expected);
}

async function handler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res, { methods: 'POST, OPTIONS', headers: 'Content-Type, X-Metrics-Key, X-Ops-Key' })) {
    return res.status(403).json({ error: 'Bu origin icin erisim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Yetkisiz katalog seed istegi.' });
  }

  const config = resolveSupabaseConfig();
  if (!config.url || !config.serviceRoleKey) {
    return res.status(503).json({
      error: 'Runtime ortaminda Supabase service role anahtari bulunamadi.',
      ready: false,
    });
  }

  try {
    const result = await seedCatalog({
      url: config.url,
      serviceRoleKey: config.serviceRoleKey,
      moleculeTable: cleanString(process.env.SUPABASE_MOLECULES_TABLE) || 'molecules',
      fragranceTable: cleanString(process.env.SUPABASE_FRAGRANCES_TABLE) || 'fragrances',
    });

    return res.status(200).json({
      ok: true,
      seeded: true,
      ...result,
      ts: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      seeded: false,
      error: cleanString(error?.message) || 'catalog_seed_failed',
      ts: new Date().toISOString(),
    });
  }
}

module.exports = handler;
