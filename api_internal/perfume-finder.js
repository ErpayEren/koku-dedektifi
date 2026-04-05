const { PERFUME_CATALOG, normalizeText } = require('../lib/server/perfume-knowledge');
const { canonicalizeNote } = require('../lib/note-ontology');

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

const SWEET_NOTES = ['vanilla', 'tonka bean', 'caramel', 'praline', 'honey', 'dates', 'cacao', 'coffee', 'amber'];

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
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

function parseList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanString(item)).filter(Boolean);
  }
  return cleanString(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumber(value, fallback, min, max) {
  const parsed = Number.parseFloat(String(value ?? '').trim());
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min || parsed > max) return fallback;
  return parsed;
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

function canonicalizeList(input) {
  const out = [];
  const seen = new Set();
  parseList(input).forEach((raw) => {
    const mapped = canonicalizeNote(raw);
    const canonical = cleanString(mapped?.canonical || raw).toLowerCase();
    if (!canonical || seen.has(canonical)) return;
    seen.add(canonical);
    out.push(canonical);
  });
  return out;
}

function toCanonicalSet(perfume) {
  const notes = [
    ...(Array.isArray(perfume?.pyramid?.top) ? perfume.pyramid.top : []),
    ...(Array.isArray(perfume?.pyramid?.middle) ? perfume.pyramid.middle : []),
    ...(Array.isArray(perfume?.pyramid?.base) ? perfume.pyramid.base : []),
  ];
  const set = new Set();
  notes.forEach((note) => {
    const mapped = canonicalizeNote(note);
    const canonical = cleanString(mapped?.canonical || note).toLowerCase();
    if (canonical) set.add(canonical);
  });
  return set;
}

function computeSweetness(set) {
  let sweetHits = 0;
  SWEET_NOTES.forEach((note) => {
    if (set.has(note)) sweetHits += 1;
  });
  const score = Math.round((sweetHits / SWEET_NOTES.length) * 100);
  return Math.max(0, Math.min(100, score));
}

function scoreCandidate(perfume, opts) {
  const notes = toCanonicalSet(perfume);
  const includeMatches = opts.include.filter((item) => notes.has(item));
  const excludeMatches = opts.exclude.filter((item) => notes.has(item));
  const includeScore = opts.include.length ? includeMatches.length / opts.include.length : 0.5;
  const excludePenalty = opts.exclude.length ? excludeMatches.length / opts.exclude.length : 0;
  const familyMatch = opts.family && normalizeText(perfume.family).includes(opts.family) ? 1 : 0;
  const occasionMatch = opts.occasion && normalizeText(perfume.occasion).includes(opts.occasion) ? 1 : 0;
  const seasonMatch = opts.season && perfume.season.some((item) => normalizeText(item).includes(opts.season)) ? 1 : 0;
  const sweetness = computeSweetness(notes);
  const targetSweetness = Number.isFinite(opts.targetSweetness) ? opts.targetSweetness : opts.maxSweetness;
  const sweetnessPenalty = sweetness > opts.maxSweetness ? (sweetness - opts.maxSweetness) / 100 : 0;
  const sweetnessDistancePenalty = Math.abs(sweetness - targetSweetness) / 100;
  const hardSweetPenalty = opts.maxSweetness <= 45 && sweetness > (opts.maxSweetness + 8) ? 0.12 : 0;

  const score = (includeScore * 0.64)
    + (familyMatch * 0.12)
    + (occasionMatch * 0.08)
    + (seasonMatch * 0.08)
    - (excludePenalty * 0.3)
    - (sweetnessPenalty * 0.32)
    - (sweetnessDistancePenalty * 0.2)
    - hardSweetPenalty;

  return {
    score,
    includeMatches,
    excludeMatches,
    sweetness,
  };
}

function scoreCandidateRelaxed(perfume, opts) {
  const strict = scoreCandidate(perfume, opts);
  const includeCoverage = opts.include.length ? (strict.includeMatches.length / opts.include.length) : 0;
  const excludePenalty = opts.exclude.length ? (strict.excludeMatches.length / Math.max(1, opts.exclude.length)) : 0;
  const familyBoost = opts.family && normalizeText(perfume.family).includes(opts.family) ? 0.18 : 0;
  const occasionBoost = opts.occasion && normalizeText(perfume.occasion).includes(opts.occasion) ? 0.1 : 0;
  const seasonBoost = opts.season && perfume.season.some((item) => normalizeText(item).includes(opts.season)) ? 0.1 : 0;
  const targetSweetness = Number.isFinite(opts.targetSweetness) ? opts.targetSweetness : opts.maxSweetness;
  const sweetnessPenalty = strict.sweetness > opts.maxSweetness ? ((strict.sweetness - opts.maxSweetness) / 100) * 0.3 : 0;
  const sweetnessDistancePenalty = Math.abs(strict.sweetness - targetSweetness) / 100 * 0.16;
  const hardSweetPenalty = opts.maxSweetness <= 45 && strict.sweetness > (opts.maxSweetness + 8) ? 0.08 : 0;

  const relaxedScore = 0.14
    + (includeCoverage * 0.5)
    + familyBoost
    + occasionBoost
    + seasonBoost
    - (excludePenalty * 0.22)
    - sweetnessPenalty
    - sweetnessDistancePenalty
    - hardSweetPenalty;

  return {
    ...strict,
    score: relaxedScore,
  };
}

function mapCandidate(perfume, scored) {
  const targetSweetness = Number.isFinite(Number(scored?.targetSweetness))
    ? Number(scored.targetSweetness)
    : null;
  const sweetnessDistance = targetSweetness === null
    ? null
    : Math.abs(Number(scored?.sweetness || 0) - targetSweetness);
  const includeMatchCount = Array.isArray(scored?.includeMatches) ? scored.includeMatches.length : 0;
  const distancePenalty = Number.isFinite(Number(sweetnessDistance)) ? (Number(sweetnessDistance) * 0.22) : 0;
  const weightedScore = (Number(scored?.score || 0) * 100) + (includeMatchCount * 2.6) - distancePenalty;
  const reasonParts = [];
  if (Array.isArray(scored?.includeMatches) && scored.includeMatches.length > 0) {
    reasonParts.push(`Dahil notalarla örtüşüyor: ${scored.includeMatches.slice(0, 3).join(', ')}`);
  }
  if (cleanString(perfume.family)) {
    reasonParts.push(`Aile: ${perfume.family}`);
  }
  if (cleanString(perfume.occasion)) {
    reasonParts.push(`Kullanım: ${perfume.occasion}`);
  }

  return {
    name: perfume.canonicalName,
    brand: cleanString(perfume.brand || ''),
    family: perfume.family,
    season: perfume.season,
    occasion: perfume.occasion,
    priceBand: perfume.priceBand || '',
    includeMatches: scored.includeMatches,
    excludeMatches: scored.excludeMatches,
    sweetness: scored.sweetness,
    sweetnessDistance,
    score: Math.max(0, Math.min(100, Math.round(weightedScore))),
    reason: reasonParts.join(' • '),
  };
}

async function handler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res)) {
    return res.status(403).json({ error: 'Bu origin icin erisim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  const body = req.method === 'POST' ? parseBody(req) : null;
  if (req.method === 'POST' && !body) {
    return res.status(400).json({ error: 'Gecersiz JSON govdesi' });
  }

  const source = req.method === 'POST' ? body : req.query;
  const include = canonicalizeList(source?.includeNotes || source?.include || '');
  const exclude = canonicalizeList(source?.excludeNotes || source?.exclude || '');
  const family = normalizeText(source?.family || '');
  const occasion = normalizeText(source?.occasion || '');
  const season = normalizeText(source?.season || '');
  const limit = Math.max(1, Math.min(20, Math.round(parseNumber(source?.limit, 8, 1, 20))));
  const maxSweetness = parseNumber(source?.maxSweetness, 100, 0, 100);
  const targetSweetness = parseNumber(source?.targetSweetness, maxSweetness, 0, 100);

  if (include.length === 0) {
    return res.status(400).json({ error: 'En az bir include note gerekli' });
  }

  const strictCandidates = PERFUME_CATALOG
    .map((perfume) => ({ perfume, scored: scoreCandidate(perfume, {
      include,
      exclude,
      family,
      occasion,
      season,
      maxSweetness,
      targetSweetness,
    }) }))
    .map((item) => ({
      ...item,
      scored: { ...item.scored, targetSweetness },
    }))
    .filter((item) => item.scored.score > 0.12)
    .filter((item) => item.scored.sweetness <= Math.min(100, maxSweetness + 20))
    .sort((a, b) => (
      b.scored.score - a.scored.score
      || b.scored.includeMatches.length - a.scored.includeMatches.length
      || Math.abs(a.scored.sweetness - targetSweetness) - Math.abs(b.scored.sweetness - targetSweetness)
      || a.perfume.canonicalName.localeCompare(b.perfume.canonicalName)
    ))
    .slice(0, limit)
    .map((item) => mapCandidate(item.perfume, item.scored));

  const fallbackApplied = strictCandidates.length === 0;
  const candidates = fallbackApplied
    ? PERFUME_CATALOG
      .map((perfume) => ({ perfume, scored: scoreCandidateRelaxed(perfume, {
        include,
        exclude,
        family,
        occasion,
        season,
        maxSweetness,
        targetSweetness,
      }) }))
      .map((item) => ({
        ...item,
        scored: { ...item.scored, targetSweetness },
      }))
      .sort((a, b) => (
        b.scored.score - a.scored.score
        || b.scored.includeMatches.length - a.scored.includeMatches.length
        || Math.abs(a.scored.sweetness - targetSweetness) - Math.abs(b.scored.sweetness - targetSweetness)
        || a.perfume.canonicalName.localeCompare(b.perfume.canonicalName)
      ))
      .slice(0, limit)
      .map((item) => mapCandidate(item.perfume, item.scored))
    : strictCandidates;

  return res.status(200).json({
    ok: true,
    query: {
      include,
      exclude,
      family,
      occasion,
      season,
      maxSweetness,
      targetSweetness,
      limit,
    },
    totalCatalog: PERFUME_CATALOG.length,
    fallbackApplied,
    candidates,
  });
}

module.exports = handler;
