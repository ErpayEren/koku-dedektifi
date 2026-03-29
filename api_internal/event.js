const { createRuntimeStore } = require('../lib/server/runtime-store');

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

const EVENT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const EVENT_RATE_LIMIT_MAX = 60;
const MAX_BODY_BYTES = 12 * 1024;
const MAX_EVENT_LEN = 64;
const MAX_PROPS_KEYS = 16;
const MAX_STRING_VALUE_LEN = 300;
const MAX_BREAKDOWN_VALUES = 12;
const EVENT_NAME_RE = /^[a-z0-9._:-]+$/i;

const eventStore = createRuntimeStore({
  rateLimitWindowMs: EVENT_RATE_LIMIT_WINDOW_MS,
  rateLimitMax: EVENT_RATE_LIMIT_MAX,
  cacheTtlMs: 45 * 24 * 60 * 60 * 1000,
  cacheMaxEntries: 4000,
  keyPrefix: 'koku-dedektifi-event',
});

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';
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
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    return true;
  }

  if (!getAllowedOrigins(req).has(origin)) return false;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  return true;
}

function sanitizeProps(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};

  const entries = Object.entries(input).slice(0, MAX_PROPS_KEYS);
  const out = {};

  for (const [rawKey, value] of entries) {
    const key = cleanString(rawKey).slice(0, 40);
    if (!key) continue;

    if (typeof value === 'string') {
      out[key] = value.slice(0, MAX_STRING_VALUE_LEN);
      continue;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = value;
      continue;
    }
    if (typeof value === 'boolean') {
      out[key] = value;
    }
  }

  return out;
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

function normalizeBreakdownValue(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return cleanString(value).slice(0, 40);
}

function mergeBreakdowns(prevBreakdowns, props) {
  const next = prevBreakdowns && typeof prevBreakdowns === 'object' && !Array.isArray(prevBreakdowns)
    ? { ...prevBreakdowns }
    : {};

  for (const [propKey, rawValue] of Object.entries(props || {})) {
    const value = normalizeBreakdownValue(rawValue);
    if (!value) continue;

    const bucket = next[propKey] && typeof next[propKey] === 'object' && !Array.isArray(next[propKey])
      ? { ...next[propKey] }
      : {};

    bucket[value] = Number(bucket[value] || 0) + 1;

    next[propKey] = Object.fromEntries(
      Object.entries(bucket)
        .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0) || String(a[0]).localeCompare(String(b[0])))
        .slice(0, MAX_BREAKDOWN_VALUES),
    );
  }

  return next;
}

async function handler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res)) {
    return res.status(403).json({ error: 'Bu origin icin erisim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Gecersiz JSON govdesi' });
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'Istek cok buyuk' });
  }

  const eventName = cleanString(body.event);
  if (!eventName || eventName.length > MAX_EVENT_LEN || !EVENT_NAME_RE.test(eventName)) {
    return res.status(400).json({ error: 'Gecersiz event ismi' });
  }

  const ip = getClientIP(req);
  const rate = await eventStore.checkRateLimit(ip);
  if (!rate.allowed) {
    const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'Cok fazla event gonderildi', retryAfter });
  }

  const nowIso = new Date().toISOString();
  const day = nowIso.slice(0, 10);
  const eventKey = `${day}:${eventName}`;
  const props = sanitizeProps(body.props);

  const prev = await eventStore.getCache(eventKey);
  const next = {
    event: eventName,
    day,
    count: Number(prev?.count || 0) + 1,
    firstAt: prev?.firstAt || nowIso,
    lastAt: nowIso,
    sampleProps: Object.keys(props).length > 0 ? props : (prev?.sampleProps || {}),
    breakdowns: mergeBreakdowns(prev?.breakdowns, props),
  };

  await eventStore.setCache(eventKey, next);

  const dayIndexKey = `index:${day}`;
  const dayIndexPrev = await eventStore.getCache(dayIndexKey);
  const knownEvents = Array.isArray(dayIndexPrev?.events) ? dayIndexPrev.events : [];
  if (!knownEvents.includes(eventName)) knownEvents.push(eventName);
  await eventStore.setCache(dayIndexKey, {
    day,
    events: knownEvents.slice(0, 200),
    updatedAt: nowIso,
  });

  const totalKey = `${day}:__total__`;
  const totalPrev = await eventStore.getCache(totalKey);
  await eventStore.setCache(totalKey, {
    count: Number(totalPrev?.count || 0) + 1,
    day,
    lastAt: nowIso,
  });

  res.setHeader('X-Event-Store', eventStore.getBackendName());
  return res.status(202).json({ ok: true });
}

handler.config = {
  api: {
    bodyParser: {
      sizeLimit: '16kb',
    },
  },
};

module.exports = handler;
