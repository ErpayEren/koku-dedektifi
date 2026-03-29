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

const LONGEVITY_OPTIONS = ['weak', 'balanced', 'strong'];
const SILLAGE_OPTIONS = ['soft', 'moderate', 'loud'];

const votesStore = createRuntimeStore({
  cacheTtlMs: 365 * 24 * 60 * 60 * 1000,
  cacheMaxEntries: 12000,
  keyPrefix: 'koku-perfume-votes',
  rateLimitWindowMs: 60 * 1000,
  rateLimitMax: 45,
});

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeText(value) {
  return cleanString(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slugify(value) {
  return normalizeText(value).replace(/\s+/g, '-').slice(0, 140);
}

function stableHash(value) {
  const text = String(value || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(31, hash) + text.charCodeAt(i) | 0;
  }
  return Math.abs(hash).toString(36);
}

function getClientIp(req) {
  const forwarded = cleanString(req.headers['x-forwarded-for']).split(',')[0];
  return cleanString(forwarded) || cleanString(req.socket?.remoteAddress) || 'unknown';
}

function getClientFingerprint(req) {
  const ip = getClientIp(req);
  const ua = cleanString(req.headers['user-agent']).slice(0, 180);
  return stableHash(`${ip}|${ua}`);
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return null;
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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    return true;
  }

  if (!getAllowedOrigins(req).has(origin)) return false;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  return true;
}

function emptyAggregate(displayName = '') {
  return {
    displayName,
    total: 0,
    longevity: {
      weak: 0,
      balanced: 0,
      strong: 0,
    },
    sillage: {
      soft: 0,
      moderate: 0,
      loud: 0,
    },
    updatedAt: new Date().toISOString(),
  };
}

function normalizeAggregate(raw, fallbackName = '') {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = emptyAggregate(cleanString(src.displayName) || fallbackName);
  out.total = Math.max(0, Number(src.total || 0));
  LONGEVITY_OPTIONS.forEach((key) => {
    out.longevity[key] = Math.max(0, Number(src.longevity?.[key] || 0));
  });
  SILLAGE_OPTIONS.forEach((key) => {
    out.sillage[key] = Math.max(0, Number(src.sillage?.[key] || 0));
  });
  out.updatedAt = cleanString(src.updatedAt) || out.updatedAt;
  return out;
}

function enrichAggregate(payload, slug) {
  const total = Math.max(0, Number(payload.total || 0));
  const ratio = (count) => (total > 0 ? Math.round((Number(count || 0) / total) * 1000) / 10 : 0);
  return {
    ok: true,
    perfume: payload.displayName,
    slug,
    total,
    longevity: {
      ...payload.longevity,
      pct: {
        weak: ratio(payload.longevity.weak),
        balanced: ratio(payload.longevity.balanced),
        strong: ratio(payload.longevity.strong),
      },
    },
    sillage: {
      ...payload.sillage,
      pct: {
        soft: ratio(payload.sillage.soft),
        moderate: ratio(payload.sillage.moderate),
        loud: ratio(payload.sillage.loud),
      },
    },
    updatedAt: payload.updatedAt,
    store: votesStore.getBackendName(),
  };
}

async function getAggregate(perfumeName) {
  const displayName = cleanString(perfumeName).slice(0, 120);
  const slug = slugify(displayName);
  if (!slug) return { slug: '', aggregate: emptyAggregate('') };
  const row = await votesStore.getCache(`aggregate:${slug}`);
  return {
    slug,
    aggregate: normalizeAggregate(row, displayName),
  };
}

async function putVote(perfumeName, longevity, sillage) {
  const displayName = cleanString(perfumeName).slice(0, 120);
  const slug = slugify(displayName);
  if (!slug) throw new Error('invalid_perfume');

  const row = await votesStore.getCache(`aggregate:${slug}`);
  const next = normalizeAggregate(row, displayName);
  next.displayName = displayName || next.displayName;
  next.total += 1;
  next.longevity[longevity] += 1;
  next.sillage[sillage] += 1;
  next.updatedAt = new Date().toISOString();
  await votesStore.setCache(`aggregate:${slug}`, next);
  return { slug, aggregate: next };
}

function getVoteLockKey(slug, req) {
  const dateKey = new Date().toISOString().slice(0, 10);
  const fingerprint = getClientFingerprint(req);
  return `vote-lock:${slug}:${fingerprint}:${dateKey}`;
}

async function handler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res)) {
    return res.status(403).json({ error: 'Bu origin icin erisim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  const rate = await votesStore.checkRateLimit(`vote:${getClientIp(req)}`);
  if (!rate.allowed) {
    const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'Cok fazla oy istegi', retryAfter });
  }

  if (req.method === 'GET') {
    const perfumeName = cleanString(req.query?.perfume || req.query?.name);
    if (!perfumeName) return res.status(400).json({ error: 'perfume gerekli' });
    const result = await getAggregate(perfumeName);
    return res.status(200).json(enrichAggregate(result.aggregate, result.slug));
  }

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Gecersiz JSON govdesi' });

  const perfumeName = cleanString(body.perfume || body.name).slice(0, 120);
  const longevity = cleanString(body.longevity).toLowerCase();
  const sillage = cleanString(body.sillage).toLowerCase();

  if (!perfumeName) return res.status(400).json({ error: 'perfume gerekli' });
  if (!LONGEVITY_OPTIONS.includes(longevity)) {
    return res.status(400).json({ error: `longevity gecersiz (izinli: ${LONGEVITY_OPTIONS.join(', ')})` });
  }
  if (!SILLAGE_OPTIONS.includes(sillage)) {
    return res.status(400).json({ error: `sillage gecersiz (izinli: ${SILLAGE_OPTIONS.join(', ')})` });
  }

  const slug = slugify(perfumeName);
  const lockKey = getVoteLockKey(slug, req);
  const alreadyVoted = await votesStore.getCache(lockKey);
  if (alreadyVoted) {
    const current = await getAggregate(perfumeName);
    return res.status(200).json({
      ...enrichAggregate(current.aggregate, current.slug),
      duplicate: true,
      message: 'Bu parfum icin bugun zaten oy verdin.',
    });
  }

  const result = await putVote(perfumeName, longevity, sillage);
  await votesStore.setCache(lockKey, {
    ts: new Date().toISOString(),
    perfume: perfumeName,
    longevity,
    sillage,
  });
  return res.status(200).json(enrichAggregate(result.aggregate, result.slug));
}

module.exports = handler;
