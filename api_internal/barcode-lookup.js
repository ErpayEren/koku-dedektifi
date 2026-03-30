const { matchKnownPerfume } = require('../lib/server/perfume-knowledge');
const { cleanString, setCorsHeaders, setSecurityHeaders } = require('../lib/server/config');
const { requirePlan } = require('../lib/server/plan-guard');

const BARCODE_MAP = {
  '3348901520196': 'Dior Sauvage Eau de Parfum',
  '3346470143172': 'Chanel N5 Eau de Parfum',
  '3700559600012': 'Baccarat Rouge 540 Eau de Parfum',
  '3508441001114': 'Creed Aventus',
  '887167033542': 'Tom Ford Black Orchid Eau de Parfum',
  '3614272648425': 'YSL Libre Eau de Parfum',
};

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

function lookupBarcode(code) {
  const perfumeName = BARCODE_MAP[code] || '';
  if (!perfumeName) return null;
  return matchKnownPerfume(perfumeName) || { canonicalName: perfumeName };
}

async function handler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res, { methods: 'GET, POST, OPTIONS', headers: 'Content-Type, Authorization' })) {
    return res.status(403).json({ error: 'Bu origin için erişim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  try {
    await requirePlan(req, 'pro');
  } catch (error) {
    return res.status(error?.statusCode || 403).json(error?.body || { error: 'Pro plan gerekli.', upgrade: '/paketler' });
  }

  const source = req.method === 'GET' ? req.query : parseBody(req) || {};
  const code = normalizeBarcode(source?.code || source?.barcode || '');
  if (!code || code.length < 8) {
    return res.status(400).json({ error: 'Geçerli barcode gerekli' });
  }

  const match = lookupBarcode(code);
  if (!match) {
    return res.status(200).json({
      ok: true,
      found: false,
      code,
      suggestion: '',
      message: 'Barcode katalogda yok, manuel aramaya geç.',
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
