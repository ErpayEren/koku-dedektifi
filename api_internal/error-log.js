const crypto = require('crypto');
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

const MAX_BODY_BYTES = 20 * 1024;
const MAX_MESSAGE = 800;
const MAX_CONTEXT_KEYS = 24;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 80;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const errorStore = createRuntimeStore({
  rateLimitWindowMs: RATE_LIMIT_WINDOW_MS,
  rateLimitMax: RATE_LIMIT_MAX,
  cacheTtlMs: 60 * 24 * 60 * 60 * 1000,
  cacheMaxEntries: 8000,
  keyPrefix: 'koku-client-error',
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Metrics-Key');
    res.setHeader('Access-Control-Max-Age', '86400');
    return true;
  }

  if (!getAllowedOrigins(req).has(origin)) return false;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Metrics-Key');
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

function sanitizeContext(context) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) return {};
  const out = {};
  Object.entries(context).slice(0, MAX_CONTEXT_KEYS).forEach(([rawKey, rawValue]) => {
    const key = cleanString(rawKey).slice(0, 48);
    if (!key) return;
    if (typeof rawValue === 'string') {
      out[key] = rawValue.slice(0, 300);
      return;
    }
    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      out[key] = rawValue;
      return;
    }
    if (typeof rawValue === 'boolean') {
      out[key] = rawValue;
    }
  });
  return out;
}

function parseSentryDsn(rawDsn) {
  const dsn = cleanString(rawDsn);
  if (!dsn) return null;
  let url;
  try {
    url = new URL(dsn);
  } catch {
    return null;
  }
  const projectId = cleanString(url.pathname).replace(/^\/+/, '');
  const publicKey = cleanString(url.username);
  if (!projectId || !publicKey || !url.host) return null;
  return {
    dsn,
    projectId,
    publicKey,
    endpoint: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
  };
}

function makeSentryEnvelope(errorPayload, dsnInfo) {
  const eventId = crypto.randomBytes(16).toString('hex');
  const sentAt = new Date().toISOString();
  const header = JSON.stringify({
    event_id: eventId,
    sent_at: sentAt,
    dsn: dsnInfo.dsn,
  });
  const itemHeader = JSON.stringify({ type: 'event' });
  const eventBody = JSON.stringify({
    event_id: eventId,
    timestamp: sentAt,
    platform: 'javascript',
    level: errorPayload.level || 'error',
    message: { formatted: cleanString(errorPayload.message).slice(0, 800) || 'client_error' },
    tags: {
      app: 'koku-dedektifi',
      source: 'api-error-log',
    },
    extra: {
      context: errorPayload.context || {},
      clientUrl: cleanString(errorPayload.url),
      userAgent: cleanString(errorPayload.userAgent),
      ip: cleanString(errorPayload.ip),
    },
  });
  return `${header}\n${itemHeader}\n${eventBody}`;
}

async function forwardToSentry(errorPayload) {
  const dsnInfo = parseSentryDsn(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
  if (!dsnInfo) return false;

  const envelope = makeSentryEnvelope(errorPayload, dsnInfo);
  const response = await fetch(dsnInfo.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
      'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${dsnInfo.publicKey}`,
    },
    body: envelope,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || `Sentry forward failed (${response.status})`);
  }
  return true;
}

async function handler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res)) {
    return res.status(403).json({ error: 'Bu origin icin erisim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['POST', 'GET'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    const expectedKey = cleanString(process.env.METRICS_API_KEY);
    const incomingKey = cleanString(req.headers['x-metrics-key']) || cleanString(req.query?.key);
    if (!expectedKey || incomingKey !== expectedKey) {
      return res.status(401).json({ error: 'Yetkisiz' });
    }

    const day = cleanString(req.query?.day) || new Date().toISOString().slice(0, 10);
    if (!DAY_RE.test(day)) return res.status(400).json({ error: 'Gecersiz day parametresi' });

    const index = await errorStore.getCache(`index:${day}`);
    const ids = Array.isArray(index?.ids) ? index.ids.slice(0, 120) : [];
    const rows = [];
    for (const id of ids) {
      const entry = await errorStore.getCache(`entry:${id}`);
      if (entry && typeof entry === 'object') rows.push(entry);
    }

    return res.status(200).json({
      day,
      total: rows.length,
      rows,
      backend: errorStore.getBackendName(),
    });
  }

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Gecersiz JSON govdesi' });
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'Istek cok buyuk' });
  }

  const ip = getClientIP(req);
  const rate = await errorStore.checkRateLimit(`err:${ip}`);
  if (!rate.allowed) {
    const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'Cok fazla hata kaydi', retryAfter });
  }

  const level = cleanString(body.level).toLowerCase() || 'error';
  const message = cleanString(body.message).slice(0, MAX_MESSAGE);
  if (!message) return res.status(400).json({ error: 'message gerekli' });

  const nowIso = new Date().toISOString();
  const day = nowIso.slice(0, 10);
  const id = `${nowIso}:${Math.random().toString(36).slice(2, 10)}`;
  const payload = {
    id,
    ts: nowIso,
    day,
    level: ['warn', 'error', 'fatal', 'info'].includes(level) ? level : 'error',
    message,
    context: sanitizeContext(body.context),
    userAgent: cleanString(body.userAgent).slice(0, 280),
    url: cleanString(body.url).slice(0, 300),
    ip: cleanString(ip).slice(0, 60),
  };

  await errorStore.setCache(`entry:${id}`, payload);

  const dayIndexKey = `index:${day}`;
  const prevIndex = await errorStore.getCache(dayIndexKey);
  const ids = Array.isArray(prevIndex?.ids) ? prevIndex.ids : [];
  ids.unshift(id);
  await errorStore.setCache(dayIndexKey, {
    day,
    ids: ids.slice(0, 400),
    updatedAt: nowIso,
  });

  try {
    await forwardToSentry(payload);
  } catch (error) {
    console.warn('[error-log] Sentry forward failed:', error?.message || error);
  }

  return res.status(202).json({ ok: true });
}

handler.config = {
  api: {
    bodyParser: {
      sizeLimit: '24kb',
    },
  },
};

module.exports = handler;
