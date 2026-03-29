const {
  cleanString,
  parseBoolean,
  resolveSupabaseConfig,
  hasSupabaseServiceConfig,
  shouldRequireSupabaseWardrobe,
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

function shouldRequireSupabaseFeed() {
  if (cleanString(process.env.FEED_REQUIRE_SUPABASE)) {
    return parseBoolean(process.env.FEED_REQUIRE_SUPABASE, false);
  }
  return shouldRequireSupabaseWardrobe();
}

function allowRuntimeFallback() {
  if (shouldRequireSupabaseFeed()) return false;
  if (cleanString(process.env.FEED_ALLOW_RUNTIME_FALLBACK)) {
    return parseBoolean(process.env.FEED_ALLOW_RUNTIME_FALLBACK, false);
  }
  return true;
}

async function pingSupabaseFeed(config, table) {
  if (!config.url || !config.serviceRoleKey) {
    return { ok: false, reason: 'supabase_missing' };
  }
  const url = `${config.url}/rest/v1/${encodeURIComponent(table)}?select=user_id&limit=1`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    return {
      ok: false,
      reason: cleanString(body) || `supabase_http_${response.status}`,
      status: response.status,
    };
  }

  return { ok: true };
}

async function handler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res)) {
    return res.status(403).json({ error: 'Bu origin icin erisim izni yok.' });
  }
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = resolveSupabaseConfig();
  const table = cleanString(process.env.SUPABASE_FEED_TABLE) || 'community_feed';
  const configured = hasSupabaseServiceConfig();
  const requireSupabase = shouldRequireSupabaseFeed();
  const runtimeFallbackAllowed = allowRuntimeFallback();

  let ping = { ok: false, reason: 'skipped' };
  if (configured) {
    try {
      ping = await pingSupabaseFeed(supabase, table);
    } catch (error) {
      ping = {
        ok: false,
        reason: cleanString(error?.message) || 'ping_failed',
      };
    }
  }

  const ready = configured && ping.ok;
  const strictReady = requireSupabase ? ready : (ready || runtimeFallbackAllowed);

  return res.status(200).json({
    ok: true,
    ready: strictReady,
    checks: {
      requireSupabase,
      runtimeFallbackAllowed,
      supabaseConfigured: configured,
      supabasePingOk: ping.ok,
      supabasePingReason: ping.reason || '',
      supabasePingStatus: Number.isFinite(Number(ping.status)) ? Number(ping.status) : 0,
      sources: supabase.sources,
      table,
      urlHost: cleanString(supabase.url).replace(/^https?:\/\//i, ''),
    },
    ts: new Date().toISOString(),
  });
}

module.exports = handler;

