const crypto = require('crypto');
const { createRuntimeStore } = require('../lib/server/runtime-store');
const { fetchSupabaseUserById, hasSupabaseAuthUsersConfig } = require('../lib/server/supabase-auth-users');
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

const FEED_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const FEED_RATE_LIMIT_MAX = 60;
const FEED_TTL_MS = 540 * 24 * 60 * 60 * 1000;
const MAX_EVENTS = 200;
const MAX_DETAIL = 180;

const userStore = createRuntimeStore({
  cacheTtlMs: 365 * 24 * 60 * 60 * 1000,
  cacheMaxEntries: 30000,
  keyPrefix: 'koku-auth-user',
});

const sessionStore = createRuntimeStore({
  cacheTtlMs: 30 * 24 * 60 * 60 * 1000,
  cacheMaxEntries: 50000,
  keyPrefix: 'koku-auth-session',
});

const feedStore = createRuntimeStore({
  rateLimitWindowMs: FEED_RATE_LIMIT_WINDOW_MS,
  rateLimitMax: FEED_RATE_LIMIT_MAX,
  cacheTtlMs: FEED_TTL_MS,
  cacheMaxEntries: 40000,
  keyPrefix: 'koku-feed',
});

function hashSha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function sessionKey(token) {
  return `session:${hashSha256(token)}`;
}

function userKey(userId) {
  return `user:${userId}`;
}

function feedKey(userId) {
  return `feed:user:${cleanString(userId)}`;
}

function cleanDateIso(value) {
  const raw = cleanString(value);
  if (!raw) return new Date().toISOString();
  const time = Date.parse(raw);
  return Number.isFinite(time) ? new Date(time).toISOString() : new Date().toISOString();
}

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
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    return true;
  }

  if (!getAllowedOrigins(req).has(origin)) return false;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  return true;
}

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

function getAuthToken(req) {
  const authHeader = cleanString(req.headers.authorization);
  if (!authHeader.startsWith('Bearer ')) return '';
  return cleanString(authHeader.slice(7));
}

async function readAuthSession(req) {
  const token = getAuthToken(req);
  if (!token) return null;

  const session = await sessionStore.getCache(sessionKey(token));
  if (!session || session.active !== true || !session.userId) return null;

  let user = await userStore.getCache(userKey(session.userId));
  if (!user && hasSupabaseAuthUsersConfig()) {
    try {
      user = await fetchSupabaseUserById(session.userId);
      if (user?.id) {
        await userStore.setCache(userKey(user.id), user);
      }
    } catch (error) {
      console.warn('[feed] Supabase auth user lookup failed.', error?.message || error);
    }
  }
  if (!user) return null;

  return { token, session, user };
}

function sanitizeFeedEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const event = cleanString(raw.event).slice(0, 48);
  if (!event) return null;
  const detail = cleanString(raw.payload?.detail || raw.detail).slice(0, MAX_DETAIL);
  const perfume = cleanString(raw.payload?.perfume || raw.perfume).slice(0, 140);
  const ts = cleanDateIso(raw.ts);
  const id = cleanString(raw.id).slice(0, 64)
    || `${Date.parse(ts)}-${Math.random().toString(36).slice(2, 9)}`;

  return {
    id,
    event,
    payload: {
      detail,
      perfume,
    },
    ts,
  };
}

function sanitizeFeedList(raw) {
  const source = Array.isArray(raw) ? raw : [];
  const out = [];
  const seen = new Set();
  for (const item of source) {
    if (out.length >= MAX_EVENTS) break;
    const row = sanitizeFeedEvent(item);
    if (!row) continue;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  out.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
  return out.slice(0, MAX_EVENTS);
}

function getSupabaseConfig() {
  const cfg = resolveSupabaseConfig();
  return {
    url: cfg.url,
    key: cfg.serviceRoleKey,
    table: cleanString(process.env.SUPABASE_FEED_TABLE) || 'community_feed',
    sources: {
      ...cfg.sources,
      feedTable: cleanString(process.env.SUPABASE_FEED_TABLE) ? 'SUPABASE_FEED_TABLE' : '',
    },
  };
}

function hasSupabaseConfig() {
  return hasSupabaseServiceConfig();
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

function buildStorageDiagnostics() {
  const cfg = getSupabaseConfig();
  return {
    mode: hasSupabaseConfig() ? 'supabase' : 'runtime-store',
    required: shouldRequireSupabaseFeed(),
    runtimeFallbackAllowed: allowRuntimeFallback(),
    supabaseConfigured: hasSupabaseConfig(),
    supabaseSources: cfg.sources,
  };
}

async function fetchSupabaseRow(userId) {
  const cfg = getSupabaseConfig();
  const selectUrl = `${cfg.url}/rest/v1/${encodeURIComponent(cfg.table)}?user_id=eq.${encodeURIComponent(userId)}&select=user_id,feed_json,updated_at&limit=1`;
  const response = await fetch(selectUrl, {
    method: 'GET',
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `Supabase read failed (${response.status})`);
  }
  const rows = await response.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  return row && typeof row === 'object' ? row : null;
}

async function upsertSupabaseRow(userId, feed, updatedAtIso) {
  const cfg = getSupabaseConfig();
  const upsertUrl = `${cfg.url}/rest/v1/${encodeURIComponent(cfg.table)}?on_conflict=user_id`;
  const payload = {
    user_id: userId,
    feed_json: feed,
    updated_at: updatedAtIso,
  };
  const response = await fetch(upsertUrl, {
    method: 'POST',
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `Supabase upsert failed (${response.status})`);
  }
  return response.json().catch(() => []);
}

async function readFeed(userId) {
  if (hasSupabaseConfig()) {
    try {
      const row = await fetchSupabaseRow(userId);
      return {
        source: 'supabase',
        feed: sanitizeFeedList(row?.feed_json || []),
        updatedAt: cleanDateIso(row?.updated_at),
      };
    } catch (error) {
      if (!allowRuntimeFallback()) {
        throw new Error(`Supabase read failed and runtime fallback disabled: ${error?.message || error}`);
      }
      console.warn('[feed] Supabase read failed, fallback to runtime store.', error?.message || error);
    }
  } else if (!allowRuntimeFallback()) {
    throw new Error('Supabase feed config missing and runtime fallback disabled.');
  }

  const fallback = await feedStore.getCache(feedKey(userId));
  return {
    source: 'runtime-store',
    feed: sanitizeFeedList(fallback?.feed || []),
    updatedAt: cleanDateIso(fallback?.updatedAt),
  };
}

async function writeFeed(userId, feed) {
  const updatedAt = new Date().toISOString();
  const sanitized = sanitizeFeedList(feed);
  if (hasSupabaseConfig()) {
    try {
      await upsertSupabaseRow(userId, sanitized, updatedAt);
      return {
        source: 'supabase',
        feed: sanitized,
        updatedAt,
      };
    } catch (error) {
      if (!allowRuntimeFallback()) {
        throw new Error(`Supabase upsert failed and runtime fallback disabled: ${error?.message || error}`);
      }
      console.warn('[feed] Supabase upsert failed, fallback to runtime store.', error?.message || error);
    }
  } else if (!allowRuntimeFallback()) {
    throw new Error('Supabase feed config missing and runtime fallback disabled.');
  }

  await feedStore.setCache(feedKey(userId), {
    feed: sanitized,
    updatedAt,
  });
  return {
    source: 'runtime-store',
    feed: sanitized,
    updatedAt,
  };
}

async function handler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res)) {
    return res.status(403).json({ error: 'Bu origin icin erisim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'PUT'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await readAuthSession(req);
  if (!auth) return res.status(401).json({ error: 'Giris gerekli' });

  const rate = await feedStore.checkRateLimit(`feed:${auth.user.id}`);
  if (!rate.allowed) {
    const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'Cok fazla feed istegi', retryAfter });
  }

  if (req.method === 'GET') {
    let current;
    try {
      current = await readFeed(auth.user.id);
    } catch (error) {
      console.error('[feed] Read error:', error?.message || error);
      return res.status(503).json({
        error: 'Koku Akisi su anda kullanilamiyor. Supabase baglantisini kontrol et.',
        code: 'feed_store_unavailable',
        diagnostics: buildStorageDiagnostics(),
      });
    }
    res.setHeader('X-Feed-Storage', current.source);
    return res.status(200).json({
      ok: true,
      feed: current.feed,
      updatedAt: current.updatedAt,
      storage: current.source,
      diagnostics: buildStorageDiagnostics(),
    });
  }

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Gecersiz JSON govdesi' });
  let saved;
  try {
    saved = await writeFeed(auth.user.id, body.feed || []);
  } catch (error) {
    console.error('[feed] Write error:', error?.message || error);
    return res.status(503).json({
      error: 'Koku Akisi kaydedilemedi. Supabase baglantisini kontrol et.',
      code: 'feed_store_unavailable',
      diagnostics: buildStorageDiagnostics(),
    });
  }
  res.setHeader('X-Feed-Storage', saved.source);
  return res.status(200).json({
    ok: true,
    feed: saved.feed,
    updatedAt: saved.updatedAt,
    storage: saved.source,
    diagnostics: buildStorageDiagnostics(),
  });
}

module.exports = handler;

