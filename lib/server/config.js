const DEFAULT_ALLOWED_ORIGINS = [
  'https://koku-dedektifi.vercel.app',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
  .reduce((list, origin) => (list.includes(origin) ? list : [...list, origin]), DEFAULT_ALLOWED_ORIGINS);

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'X-Robots-Tag': 'noindex, nofollow',
};

const MAX_BODY_BYTES = Number.isFinite(Number.parseInt(process.env.MAX_BODY_BYTES || '', 10))
  ? Math.max(8 * 1024, Number.parseInt(process.env.MAX_BODY_BYTES || '0', 10))
  : 256 * 1024;

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function setSecurityHeaders(res, extraHeaders = {}) {
  for (const [key, value] of Object.entries({ ...SECURITY_HEADERS, ...extraHeaders })) {
    res.setHeader(key, value);
  }
}

function getAllowedOrigins(req, extraOrigins = []) {
  const origins = new Set([...ALLOWED_ORIGINS, ...extraOrigins].filter(Boolean));
  const forwardedHost = cleanString(req.headers['x-forwarded-host']);
  const host = cleanString(req.headers.host);
  const candidateHost = forwardedHost || host;

  if (candidateHost) {
    const proto =
      cleanString(req.headers['x-forwarded-proto']) ||
      (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(candidateHost) ? 'http' : 'https');
    origins.add(`${proto}://${candidateHost}`);
  }

  return origins;
}

function setCorsHeaders(req, res, options = {}) {
  const methods = cleanString(options.methods) || 'GET, POST, PUT, PATCH, OPTIONS';
  const headers = cleanString(options.headers) || 'Content-Type, Authorization';
  const maxAge = cleanString(options.maxAge) || '86400';
  const credentials = options.credentials !== false;

  const origin = cleanString(req.headers.origin);
  if (!origin) {
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', headers);
    res.setHeader('Access-Control-Max-Age', maxAge);
    if (credentials) res.setHeader('Access-Control-Allow-Credentials', 'true');
    return true;
  }

  if (!getAllowedOrigins(req).has(origin)) return false;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', headers);
  res.setHeader('Access-Control-Max-Age', maxAge);
  if (credentials) res.setHeader('Access-Control-Allow-Credentials', 'true');
  return true;
}

module.exports = {
  ALLOWED_ORIGINS,
  SECURITY_HEADERS,
  MAX_BODY_BYTES,
  cleanString,
  getAllowedOrigins,
  setCorsHeaders,
  setSecurityHeaders,
};
