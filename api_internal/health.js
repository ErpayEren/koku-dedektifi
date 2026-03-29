const { createRuntimeStore } = require('../lib/server/runtime-store');
const {
  cleanString,
  parseBoolean,
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

const healthStore = createRuntimeStore({
  cacheTtlMs: 2 * 60 * 1000,
  cacheMaxEntries: 20,
  keyPrefix: 'koku-dedektifi-health',
  // Health endpoint should stay readable even when runtime store is degraded.
  allowNonDurableFallback: true,
});

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

function hasProvider() {
  return Boolean(
    cleanString(process.env.GEMINI_API_KEY)
    || cleanString(process.env.OPENROUTER_API_KEY)
    || cleanString(process.env.ANTHROPIC_API_KEY)
    || cleanString(process.env.LLM_API_KEY)
  );
}

function hasDurableKV() {
  return Boolean(
    cleanString(process.env.KV_REST_API_URL) && cleanString(process.env.KV_REST_API_TOKEN)
  );
}

function hasSentryConfig() {
  return Boolean(
    cleanString(process.env.SENTRY_DSN) || cleanString(process.env.NEXT_PUBLIC_SENTRY_DSN)
  );
}

function isWardrobeRuntimeFallbackAllowed() {
  if (shouldRequireSupabaseWardrobe()) return false;
  if (cleanString(process.env.WARDROBE_ALLOW_RUNTIME_FALLBACK)) {
    return parseBoolean(process.env.WARDROBE_ALLOW_RUNTIME_FALLBACK, false);
  }
  return true;
}

function shouldRequireSupabaseFeed() {
  if (cleanString(process.env.FEED_REQUIRE_SUPABASE)) {
    return parseBoolean(process.env.FEED_REQUIRE_SUPABASE, false);
  }
  return shouldRequireSupabaseWardrobe();
}

function isFeedRuntimeFallbackAllowed() {
  if (shouldRequireSupabaseFeed()) return false;
  if (cleanString(process.env.FEED_ALLOW_RUNTIME_FALLBACK)) {
    return parseBoolean(process.env.FEED_ALLOW_RUNTIME_FALLBACK, false);
  }
  return true;
}

async function handler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res)) {
    return res.status(403).json({ error: 'Bu origin icin erisim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const nowIso = new Date().toISOString();
  let ping = null;
  let runtimeStoreError = '';
  try {
    await healthStore.setCache('ping', { ts: nowIso });
    ping = await healthStore.getCache('ping');
  } catch (error) {
    runtimeStoreError = cleanString(error?.message) || 'runtime_store_unavailable';
  }

  const kvConfigured = hasDurableKV();
  const providerConfigured = hasProvider();
  const strictDurability = !parseBoolean(process.env.ALLOW_NON_DURABLE_STORE, false)
    && cleanString(process.env.VERCEL_ENV).toLowerCase() === 'production';
  const durableCandidate = healthStore.hasDurableCandidate();
  const durableReady = strictDurability ? durableCandidate : true;
  const pingRoundtrip = Boolean(ping?.ts);
  const sentryConfigured = hasSentryConfig();
  const wardrobeSupabaseRequired = shouldRequireSupabaseWardrobe();
  const wardrobeSupabaseConfigured = hasSupabaseServiceConfig();
  const wardrobeRuntimeFallbackAllowed = isWardrobeRuntimeFallbackAllowed();
  const wardrobeReady = wardrobeSupabaseRequired
    ? wardrobeSupabaseConfigured
    : (wardrobeSupabaseConfigured || wardrobeRuntimeFallbackAllowed);
  const feedSupabaseRequired = shouldRequireSupabaseFeed();
  const feedSupabaseConfigured = hasSupabaseServiceConfig();
  const feedRuntimeFallbackAllowed = isFeedRuntimeFallbackAllowed();
  const feedReady = feedSupabaseRequired
    ? feedSupabaseConfigured
    : (feedSupabaseConfigured || feedRuntimeFallbackAllowed);
  const ready = providerConfigured
    && kvConfigured
    && durableReady
    && pingRoundtrip
    && !runtimeStoreError
    && wardrobeReady
    && feedReady;

  return res.status(200).json({
    ok: true,
    ready,
    ts: nowIso,
    checks: {
      providerConfigured,
      kvConfigured,
      storeBackend: healthStore.getBackendName(),
      storeDurable: healthStore.isDurable(),
      storeHasDurableCandidate: durableCandidate,
      strictDurability,
      storeDurableReady: durableReady,
      pingRoundtrip,
      runtimeStoreError,
      sentryConfigured,
      wardrobeSupabaseRequired,
      wardrobeSupabaseConfigured,
      wardrobeRuntimeFallbackAllowed,
      wardrobeReady,
      feedSupabaseRequired,
      feedSupabaseConfigured,
      feedRuntimeFallbackAllowed,
      feedReady,
    },
  });
}

module.exports = handler;
