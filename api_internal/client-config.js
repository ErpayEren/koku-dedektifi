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

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseFloatInRange(value, fallback, min, max) {
  const parsed = Number.parseFloat(String(value ?? '').trim());
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min || parsed > max) return fallback;
  return parsed;
}

function firstEnv(keys) {
  for (const key of keys) {
    const value = cleanString(process.env[key]);
    if (value) return value;
  }
  return '';
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

function buildClientConfig() {
  const sentryDsn = firstEnv([
    'SENTRY_DSN',
    'NEXT_PUBLIC_SENTRY_DSN',
    'PUBLIC_SENTRY_DSN',
    'VITE_SENTRY_DSN',
  ]);
  const sentryEnv = firstEnv([
    'SENTRY_ENVIRONMENT',
    'NEXT_PUBLIC_SENTRY_ENVIRONMENT',
    'VITE_SENTRY_ENVIRONMENT',
  ]) || cleanString(process.env.VERCEL_ENV || process.env.NODE_ENV || 'production');
  const sentrySampleRate = parseFloatInRange(
    process.env.SENTRY_TRACES_SAMPLE_RATE,
    0,
    0,
    1,
  );

  return {
    errorTracking: {
      provider: sentryDsn ? 'sentry' : 'none',
      sentryDsn,
      environment: sentryEnv,
      tracesSampleRate: sentrySampleRate,
      release: firstEnv([
        'SENTRY_RELEASE',
        'NEXT_PUBLIC_SENTRY_RELEASE',
      ]) || cleanString(process.env.VERCEL_GIT_COMMIT_SHA || ''),
    },
  };
}

async function handler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res)) {
    return res.status(403).json({ error: 'Bu origin icin erisim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  return res.status(200).json({
    ok: true,
    config: buildClientConfig(),
  });
}

module.exports = handler;
