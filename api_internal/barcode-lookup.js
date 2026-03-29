const { matchKnownPerfume } = require('../lib/server/perfume-knowledge');

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

const BARCODE_MAP = {
  '3348901520196': 'Dior Sauvage Eau de Parfum',
  '3346470143172': 'Chanel N5 Eau de Parfum',
  '3700559600012': 'Baccarat Rouge 540 Eau de Parfum',
  '3508441001114': 'Creed Aventus',
  '887167033542': 'Tom Ford Black Orchid Eau de Parfum',
  '3614272648425': 'YSL Libre Eau de Parfum',
};

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBarcode(value) {
  return cleanString(value).replace(/[^0-9]/g, '').slice(0, 18);
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

function lookupBarcode(code) {
  const perfumeName = BARCODE_MAP[code] || '';
  if (!perfumeName) return null;
  return matchKnownPerfume(perfumeName) || { canonicalName: perfumeName };
}

async function handler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res)) {
    return res.status(403).json({ error: 'Bu origin icin erisim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  const source = req.method === 'GET' ? req.query : (parseBody(req) || {});
  const code = normalizeBarcode(source?.code || source?.barcode || '');
  if (!code || code.length < 8) {
    return res.status(400).json({ error: 'Gecerli barcode gerekli' });
  }

  const match = lookupBarcode(code);
  if (!match) {
    return res.status(200).json({
      ok: true,
      found: false,
      code,
      suggestion: '',
      message: 'Barcode katalogda yok, manuel aramaya gec.',
    });
  }

  return res.status(200).json({
    ok: true,
    found: true,
    code,
    perfume: match.canonicalName || match.name || '',
    family: cleanString(match.family || ''),
    season: Array.isArray(match.season) ? match.season : [],
    occasion: cleanString(match.occasion || ''),
  });
}

module.exports = handler;

