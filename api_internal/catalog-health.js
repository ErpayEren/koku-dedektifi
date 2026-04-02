const fs = require('fs');
const path = require('path');
const {
  cleanString,
  resolveSupabaseConfig,
  hasSupabaseServiceConfig,
} = require('../lib/server/supabase-config');

const ALLOWED_ORIGINS = [
  'https://koku-dedektifi.vercel.app',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'X-Robots-Tag': 'noindex, nofollow',
};

function setSecurityHeaders(res) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(key, value);
  }
}

function getAllowedOrigins(req) {
  const origins = new Set(ALLOWED_ORIGINS);
  const forwardedHost = cleanString(req.headers['x-forwarded-host']);
  const host = cleanString(req.headers.host);
  const candidateHost = forwardedHost || host;

  if (candidateHost) {
    const proto = cleanString(req.headers['x-forwarded-proto'])
      || (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(candidateHost) ? 'http' : 'https');
    origins.add(`${proto}://${candidateHost}`);
  }

  return origins;
}

function setCorsHeaders(req, res) {
  const origin = cleanString(req.headers.origin);
  if (!origin) {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    return true;
  }

  if (!getAllowedOrigins(req).has(origin)) return false;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  return true;
}

function readSeedCounts() {
  const seedPath = path.join(process.cwd(), 'data', 'catalog-seed.json');
  const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  return {
    fragranceCount: Array.isArray(raw.fragrances) ? raw.fragrances.length : 0,
    moleculeCount: Array.isArray(raw.molecules) ? raw.molecules.length : 0,
    everyFragranceHasThreeMolecules: Array.isArray(raw.fragrances)
      ? raw.fragrances.every((item) => Array.isArray(item.key_molecules) && item.key_molecules.length >= 3)
      : false,
  };
}

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
  if (!setCorsHeaders(req, res)) {
    return res.status(403).json({ error: 'Bu origin icin erisim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const seed = readSeedCounts();
  const supabase = resolveSupabaseConfig();
  const configured = hasSupabaseServiceConfig();
  const fragranceTable = cleanString(process.env.SUPABASE_FRAGRANCES_TABLE) || 'fragrances';
  const moleculeTable = cleanString(process.env.SUPABASE_MOLECULES_TABLE) || 'molecules';
  const databaseUrl =
    cleanString(process.env.SUPABASE_DB_URL)
    || cleanString(process.env.POSTGRES_URL)
    || cleanString(process.env.DATABASE_URL)
    || cleanString(process.env.POSTGRES_PRISMA_URL)
    || cleanString(process.env.POSTGRES_URL_NON_POOLING)
    || cleanString(process.env.SUPABASE_DB_URI);

  let fragranceProbe = { ok: false, count: 0, status: 0, reason: configured ? 'skipped' : 'supabase_missing' };
  let moleculeProbe = { ok: false, count: 0, status: 0, reason: configured ? 'skipped' : 'supabase_missing' };

  if (configured) {
    try {
      [fragranceProbe, moleculeProbe] = await Promise.all([
        countTableRows(supabase, fragranceTable),
        countTableRows(supabase, moleculeTable),
      ]);
    } catch (error) {
      const reason = cleanString(error?.message) || 'catalog_probe_failed';
      fragranceProbe = { ok: false, count: 0, status: 0, reason };
      moleculeProbe = { ok: false, count: 0, status: 0, reason };
    }
  }

  const databaseReady = configured
    && fragranceProbe.ok
    && moleculeProbe.ok
    && fragranceProbe.count >= 20
    && moleculeProbe.count >= 20;

  const fallbackReady = seed.fragranceCount >= 20 && seed.moleculeCount >= 20 && seed.everyFragranceHasThreeMolecules;

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
      seedFragranceCount: seed.fragranceCount,
      seedMoleculeCount: seed.moleculeCount,
      everyFragranceHasThreeMolecules: seed.everyFragranceHasThreeMolecules,
      databaseFragranceCount: fragranceProbe.count,
      databaseMoleculeCount: moleculeProbe.count,
      databaseProbeOk: fragranceProbe.ok && moleculeProbe.ok,
      fragranceProbeReason: fragranceProbe.reason,
      moleculeProbeReason: moleculeProbe.reason,
      urlHost: cleanString(supabase.url).replace(/^https?:\/\//i, ''),
    },
    ts: new Date().toISOString(),
  });
}

module.exports = handler;
