const { getMoleculeInfo } = require('../lib/server/molecule-db');
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

const MAX_NAME_COUNT = 8;
const MAX_NAME_LENGTH = 120;
const PUBCHEM_TIMEOUT_MS = 5000;

const moleculeStore = createRuntimeStore({
  cacheTtlMs: 7 * 24 * 60 * 60 * 1000,
  cacheMaxEntries: 500,
  keyPrefix: 'koku-dedektifi-molecule',
});

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
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
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    return true;
  }

  if (!getAllowedOrigins(req).has(origin)) {
    return false;
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  return true;
}

function normalizeNames(req) {
  if (req.method === 'GET') {
    const single = cleanString(req.query?.name);
    return single ? [single] : [];
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }

  if (!body || !Array.isArray(body.names)) return null;
  const names = body.names
    .map((value) => cleanString(value))
    .filter(Boolean);

  if (names.length === 0 || names.length > MAX_NAME_COUNT) return null;
  if (names.some((name) => name.length > MAX_NAME_LENGTH)) return null;
  return [...new Set(names)];
}

async function fetchFromPubChem(name) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PUBCHEM_TIMEOUT_MS);

  try {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/property/IsomericSMILES,MolecularFormula/JSON`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;

    const data = await response.json();
    const molecule = data?.PropertyTable?.Properties?.[0];
    if (!molecule) return null;

    return {
      name,
      smiles: molecule.IsomericSMILES || null,
      formula: molecule.MolecularFormula || '',
      family: '',
      origin: '',
      source: 'pubchem',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function resolveMolecule(name) {
  const dbHit = getMoleculeInfo(name);
  if (dbHit) {
    return {
      query: name,
      name: dbHit.name || name,
      smiles: dbHit.smiles || null,
      formula: dbHit.formula || '',
      family: dbHit.family || '',
      origin: dbHit.origin || '',
      source: 'static',
    };
  }

  const cacheKey = `pubchem:${name.toLowerCase()}`;
  const cached = await moleculeStore.getCache(cacheKey);
  if (cached) {
    return { query: name, ...cached };
  }

  const remote = await fetchFromPubChem(name);
  if (remote) {
    await moleculeStore.setCache(cacheKey, remote);
    return { query: name, ...remote };
  }

  return {
    query: name,
    name,
    smiles: null,
    formula: '',
    family: '',
    origin: '',
    source: 'miss',
  };
}

async function handler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res)) {
    return res.status(403).json({ error: 'Bu origin icin erisim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const names = normalizeNames(req);
  if (!names) {
    return res.status(400).json({ error: `Gecersiz isim listesi. 1-${MAX_NAME_COUNT} arasi isim gonder.` });
  }

  const molecules = await Promise.all(names.map((name) => resolveMolecule(name)));
  return res.status(200).json({ molecules });
}

module.exports = handler;
