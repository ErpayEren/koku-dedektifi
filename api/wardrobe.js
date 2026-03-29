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

const MAX_BODY_BYTES = 160 * 1024;
const WARDROBE_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const WARDROBE_RATE_LIMIT_MAX = 40;
const WARDROBE_TTL_MS = 540 * 24 * 60 * 60 * 1000;
const MAX_ITEMS = 600;
const MAX_TAGS = 8;

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

const wardrobeStore = createRuntimeStore({
  rateLimitWindowMs: WARDROBE_RATE_LIMIT_WINDOW_MS,
  rateLimitMax: WARDROBE_RATE_LIMIT_MAX,
  cacheTtlMs: WARDROBE_TTL_MS,
  cacheMaxEntries: 40000,
  keyPrefix: 'koku-wardrobe',
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

function wardrobeKey(userId) {
  return `wardrobe:user:${cleanString(userId)}`;
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
      console.warn('[wardrobe] Supabase auth user lookup failed.', error?.message || error);
    }
  }
  if (!user) return null;

  return { token, session, user };
}

function sanitizeTagList(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  const seen = new Set();
  for (const item of value) {
    const tag = cleanString(item).toLowerCase().slice(0, 24);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

function sanitizeShelfItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = cleanString(raw.name).slice(0, 140);
  if (!name) return null;

  const statusRaw = cleanString(raw.status).toLowerCase();
  const status = ['wishlist', 'owned', 'tested', 'rebuy', 'skip'].includes(statusRaw)
    ? statusRaw
    : 'wishlist';

  const iconToken = cleanString(raw.iconToken || raw.emoji)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '')
    .slice(0, 24) || 'signature';

  return {
    name,
    iconToken,
    emoji: iconToken,
    family: cleanString(raw.family).slice(0, 64),
    status,
    favorite: raw.favorite === true,
    tags: sanitizeTagList(raw.tags),
    updatedAt: cleanDateIso(raw.updatedAt),
    analysis: raw.analysis && typeof raw.analysis === 'object' ? raw.analysis : null,
  };
}

function sanitizeShelfState(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const normalized = {};
  let count = 0;

  for (const [key, value] of Object.entries(source)) {
    if (count >= MAX_ITEMS) break;
    const cleanKey = cleanString(key).toLowerCase().slice(0, 160);
    if (!cleanKey) continue;
    const item = sanitizeShelfItem(value);
    if (!item) continue;
    normalized[cleanKey] = item;
    count += 1;
  }

  return normalized;
}

function getSupabaseConfig() {
  const cfg = resolveSupabaseConfig();
  return {
    url: cfg.url,
    key: cfg.serviceRoleKey,
    table: cfg.wardrobeTable,
    sources: cfg.sources,
  };
}

function hasSupabaseConfig() {
  return hasSupabaseServiceConfig();
}

function allowRuntimeFallback() {
  if (shouldRequireSupabaseWardrobe()) return false;
  if (cleanString(process.env.WARDROBE_ALLOW_RUNTIME_FALLBACK)) {
    return parseBoolean(process.env.WARDROBE_ALLOW_RUNTIME_FALLBACK, false);
  }
  return true;
}

function buildStorageDiagnostics() {
  const cfg = getSupabaseConfig();
  return {
    mode: hasSupabaseConfig() ? 'supabase' : 'runtime-store',
    required: shouldRequireSupabaseWardrobe(),
    runtimeFallbackAllowed: allowRuntimeFallback(),
    supabaseConfigured: hasSupabaseConfig(),
    supabaseSources: cfg.sources,
  };
}

async function fetchSupabaseRow(userId) {
  const cfg = getSupabaseConfig();
  const selectUrl = `${cfg.url}/rest/v1/${encodeURIComponent(cfg.table)}?user_id=eq.${encodeURIComponent(userId)}&select=user_id,shelf_json,updated_at&limit=1`;
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

async function upsertSupabaseRow(userId, shelf, updatedAtIso) {
  const cfg = getSupabaseConfig();
  const upsertUrl = `${cfg.url}/rest/v1/${encodeURIComponent(cfg.table)}?on_conflict=user_id`;
  const payload = {
    user_id: userId,
    shelf_json: shelf,
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

async function readWardrobe(userId) {
  if (hasSupabaseConfig()) {
    try {
      const row = await fetchSupabaseRow(userId);
      return {
        source: 'supabase',
        shelf: sanitizeShelfState(row?.shelf_json || {}),
        updatedAt: cleanDateIso(row?.updated_at),
      };
    } catch (error) {
      if (!allowRuntimeFallback()) {
        throw new Error(`Supabase read failed and runtime fallback disabled: ${error?.message || error}`);
      }
      console.warn('[wardrobe] Supabase read failed, fallback to runtime store.', error?.message || error);
    }
  } else if (!allowRuntimeFallback()) {
    throw new Error('Supabase wardrobe config missing and runtime fallback disabled.');
  }

  const fallback = await wardrobeStore.getCache(wardrobeKey(userId));
  return {
    source: 'runtime-store',
    shelf: sanitizeShelfState(fallback?.shelf || {}),
    updatedAt: cleanDateIso(fallback?.updatedAt),
  };
}

async function writeWardrobe(userId, shelf) {
  const updatedAt = new Date().toISOString();
  const sanitized = sanitizeShelfState(shelf);

  if (hasSupabaseConfig()) {
    try {
      await upsertSupabaseRow(userId, sanitized, updatedAt);
      return {
        source: 'supabase',
        shelf: sanitized,
        updatedAt,
      };
    } catch (error) {
      if (!allowRuntimeFallback()) {
        throw new Error(`Supabase upsert failed and runtime fallback disabled: ${error?.message || error}`);
      }
      console.warn('[wardrobe] Supabase upsert failed, fallback to runtime store.', error?.message || error);
    }
  } else if (!allowRuntimeFallback()) {
    throw new Error('Supabase wardrobe config missing and runtime fallback disabled.');
  }

  const payload = {
    shelf: sanitized,
    updatedAt,
  };
  await wardrobeStore.setCache(wardrobeKey(userId), payload);
  return {
    source: 'runtime-store',
    shelf: sanitized,
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

  const rate = await wardrobeStore.checkRateLimit(`wardrobe:${auth.user.id}`);
  if (!rate.allowed) {
    const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'Cok fazla wardrobe istegi', retryAfter });
  }

  if (req.method === 'GET') {
    let current;
    try {
      current = await readWardrobe(auth.user.id);
    } catch (error) {
      console.error('[wardrobe] Read error:', error?.message || error);
      return res.status(503).json({
        error: 'Koku Dolabim su anda kullanilamiyor. Supabase baglantisini kontrol et.',
        code: 'wardrobe_store_unavailable',
        diagnostics: buildStorageDiagnostics(),
      });
    }
    res.setHeader('X-Wardrobe-Storage', current.source);
    return res.status(200).json({
      ok: true,
      shelf: current.shelf,
      updatedAt: current.updatedAt,
      storage: current.source,
      diagnostics: buildStorageDiagnostics(),
    });
  }

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Gecersiz JSON govdesi' });
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'Istek cok buyuk' });
  }

  let saved;
  try {
    saved = await writeWardrobe(auth.user.id, body.shelf || {});
  } catch (error) {
    console.error('[wardrobe] Write error:', error?.message || error);
    return res.status(503).json({
      error: 'Koku Dolabim kaydedilemedi. Supabase baglantisini kontrol et.',
      code: 'wardrobe_store_unavailable',
      diagnostics: buildStorageDiagnostics(),
    });
  }
  res.setHeader('X-Wardrobe-Storage', saved.source);
  return res.status(200).json({
    ok: true,
    shelf: saved.shelf,
    updatedAt: saved.updatedAt,
    storage: saved.source,
    diagnostics: buildStorageDiagnostics(),
  });
}

handler.config = {
  api: {
    bodyParser: {
      sizeLimit: '192kb',
    },
  },
};

module.exports = handler;
