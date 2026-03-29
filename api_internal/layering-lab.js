const { matchKnownPerfume, enrichAnalysisResult } = require('../lib/server/perfume-knowledge');

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

function normalizeText(value) {
  return cleanString(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
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

function toList(value) {
  if (Array.isArray(value)) return value.map((item) => cleanString(item)).filter(Boolean);
  const single = cleanString(value);
  return single ? [single] : [];
}

function dedupe(list, limit = 8) {
  const seen = new Set();
  const out = [];
  list.forEach((item) => {
    const normalized = normalizeText(item);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(cleanString(item));
  });
  return out.slice(0, limit);
}

function normalizePyramid(pyramid) {
  const src = pyramid && typeof pyramid === 'object' ? pyramid : {};
  const top = dedupe(toList(src.top), 8);
  const middle = dedupe(toList(src.middle), 8);
  const base = dedupe(toList(src.base), 8);
  if (!top.length && !middle.length && !base.length) return null;
  return { top, middle, base };
}

function buildRuntimeProfile(name, profile) {
  const src = profile && typeof profile === 'object' ? profile : {};
  const pyramid = normalizePyramid(src.pyramid);
  if (!pyramid) return null;

  const cleanName = cleanString(src.name || name).slice(0, 140);
  if (!cleanName) return null;

  return {
    canonicalName: cleanName,
    family: cleanString(src.family) || 'Aromatik',
    season: dedupe(toList(src.season), 4),
    occasion: cleanString(src.occasion) || 'Gunluk',
    pyramid,
    representativeMolecules: Array.isArray(src.molecules) ? src.molecules : [],
  };
}

function buildHeuristicProfileFromName(name) {
  const cleanName = cleanString(name).slice(0, 140);
  if (!cleanName) return null;
  const normalized = normalizeText(cleanName);

  const notes = [];
  const add = (keys, note) => {
    if (keys.some((key) => normalized.includes(normalizeText(key)))) notes.push(note);
  };

  add(['oud', 'odun', 'wood', 'sedir', 'sandal'], 'Cedarwood');
  add(['vanilla', 'vanilya', 'tonka', 'amber'], 'Vanilla');
  add(['rose', 'gul', 'jasmine', 'yasemin', 'floral'], 'Rose');
  add(['bergamot', 'citrus', 'limon', 'fresh', 'aquatic', 'marine'], 'Bergamot');
  add(['smoke', 'fire', 'tobacco', 'tabacco', 'spice'], 'Patchouli');
  add(['musk', 'misk', 'clean'], 'Musk');

  const deduped = dedupe(notes, 6);
  if (!deduped.length) deduped.push('Bergamot', 'Lavender', 'Amber');

  return {
    canonicalName: cleanName,
    family: 'Aromatik',
    season: ['Sonbahar', 'Kis'],
    occasion: 'Gunluk',
    pyramid: {
      top: deduped.slice(0, 2),
      middle: deduped.slice(2, 4).length ? deduped.slice(2, 4) : ['Lavender'],
      base: deduped.slice(4, 6).length ? deduped.slice(4, 6) : ['Amber'],
    },
    representativeMolecules: [],
  };
}

function compatibility(left, right, overlapCount) {
  const leftFamily = normalizeText(left?.family || '');
  const rightFamily = normalizeText(right?.family || '');
  let score = 56;
  if (leftFamily && rightFamily && leftFamily === rightFamily) score += 18;
  if (overlapCount >= 2) score += 15;
  if ((leftFamily.includes('woody') && rightFamily.includes('oriental'))
    || (leftFamily.includes('oriental') && rightFamily.includes('woody'))
    || (leftFamily.includes('gourmand') && rightFamily.includes('oriental'))
    || (leftFamily.includes('aromatik') && rightFamily.includes('odunsu'))) {
    score += 8;
  }
  return Math.max(35, Math.min(96, score));
}

function buildBlend(left, right) {
  const leftTop = toList(left?.pyramid?.top);
  const leftMiddle = toList(left?.pyramid?.middle);
  const leftBase = toList(left?.pyramid?.base);

  const rightTop = toList(right?.pyramid?.top);
  const rightMiddle = toList(right?.pyramid?.middle);
  const rightBase = toList(right?.pyramid?.base);

  const top = dedupe([...leftTop.slice(0, 2), ...rightTop.slice(0, 2)], 4);
  const middle = dedupe([...leftMiddle.slice(0, 3), ...rightMiddle.slice(0, 3)], 6);
  const base = dedupe([...leftBase.slice(0, 3), ...rightBase.slice(0, 3)], 6);
  const shared = dedupe([
    ...leftTop.filter((item) => [...rightTop, ...rightMiddle, ...rightBase].some((r) => normalizeText(r) === normalizeText(item))),
    ...leftMiddle.filter((item) => [...rightTop, ...rightMiddle, ...rightBase].some((r) => normalizeText(r) === normalizeText(item))),
    ...leftBase.filter((item) => [...rightTop, ...rightMiddle, ...rightBase].some((r) => normalizeText(r) === normalizeText(item))),
  ], 6);

  return {
    top,
    middle,
    base,
    shared,
    compatibility: compatibility(left, right, shared.length),
  };
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

  const leftName = cleanString(body.left || body.source || '').slice(0, 140);
  const rightName = cleanString(body.right || body.target || '').slice(0, 140);
  if (!leftName || !rightName) return res.status(400).json({ error: 'left ve right gerekli' });

  const leftKnown = matchKnownPerfume(leftName);
  const rightKnown = matchKnownPerfume(rightName);
  const left = leftKnown
    || buildRuntimeProfile(leftName, body.leftProfile || body.leftResult || body.leftData)
    || buildHeuristicProfileFromName(leftName);
  const right = rightKnown
    || buildRuntimeProfile(rightName, body.rightProfile || body.rightResult || body.rightData)
    || buildHeuristicProfileFromName(rightName);
  if (!left || !right) {
    return res.status(404).json({ error: 'Parfumlerden en az biri katalogda bulunamadi' });
  }

  const blend = buildBlend(left, right);
  const blendName = `${left.canonicalName} x ${right.canonicalName} Accord`;
  const blendDescription = `Katmanlama yorumu: ${left.canonicalName} ve ${right.canonicalName} birlikteliginde ${blend.shared.length >= 2 ? 'ortak nota omurgasi sayesinde daha stabil' : 'kontrast karakter sayesinde daha deneysel'} bir benzer profil ortaya cikar.`;

  const enriched = await enrichAnalysisResult({
    name: blendName,
    family: left.family || right.family || 'Oryantal',
    occasion: right.occasion || left.occasion || 'Aksam',
    season: dedupe([...(left.season || []), ...(right.season || [])], 4),
    intensity: Math.round((Number(body.intensity || 0) + blend.compatibility) / 2) || blend.compatibility,
    pyramid: {
      top: blend.top,
      middle: blend.middle,
      base: blend.base,
    },
    description: blendDescription,
    similar: dedupe([left.canonicalName, right.canonicalName], 4),
    technical: [
      { label: 'Uyum Skoru', value: blend.compatibility >= 80 ? 'Yuksek' : 'Orta', score: blend.compatibility },
      { label: 'Ortak Nota', value: String(blend.shared.length) },
      { label: 'Katmanlama Modu', value: 'Layering Lab v1' },
    ],
    layering: {
      pair: `${left.canonicalName} + ${right.canonicalName}`,
      result: `Ustte ${blend.top.join(', ')} ile acilip, kalpte ${blend.middle.slice(0, 3).join(', ')} baskinlasir; dipte ${blend.base.slice(0, 3).join(', ')} izi kalir.`,
    },
  }, {
    inputTexts: [`layering lab ${leftName} ${rightName}`],
    skipCatalogMatch: true,
  });

  return res.status(200).json({
    ok: true,
    blend: {
      left: left.canonicalName,
      right: right.canonicalName,
      compatibility: blend.compatibility,
      sharedNotes: blend.shared,
    },
    result: enriched,
  });
}

module.exports = handler;
