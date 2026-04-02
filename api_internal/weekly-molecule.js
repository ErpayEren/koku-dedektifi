const { setCorsHeaders, setSecurityHeaders } = require('../lib/server/config');
const catalogSeed = require('../data/catalog-seed.json');

function getMolecules() {
  return Array.isArray(catalogSeed?.molecules) ? catalogSeed.molecules : [];
}

function getFragrances() {
  return Array.isArray(catalogSeed?.fragrances) ? catalogSeed.fragrances : [];
}

function getWeekIndex(date = new Date()) {
  const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor(utc / (7 * 24 * 60 * 60 * 1000));
}

function getWeeklyMolecule() {
  const molecules = getMolecules();
  if (molecules.length === 0) return null;
  const index = Math.abs(getWeekIndex(new Date())) % molecules.length;
  return molecules[index] || null;
}

function getFragrancesForMolecule(moleculeSlug) {
  return getFragrances()
    .filter((fragrance) =>
      Array.isArray(fragrance?.key_molecules) &&
      fragrance.key_molecules.some((entry) => entry?.slug === moleculeSlug),
    )
    .slice(0, 6);
}

async function handler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res, { methods: 'GET, OPTIONS' })) {
    return res.status(403).json({ error: 'Bu origin için erişim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const molecule = getWeeklyMolecule();
  if (!molecule) {
    return res.status(404).json({ error: 'Haftalık molekül henüz hazır değil.' });
  }

  const fragrances = getFragrancesForMolecule(molecule.slug);
  return res.status(200).json({
    ok: true,
    molecule,
    fragrances,
    generatedAt: new Date().toISOString(),
  });
}

module.exports = handler;
