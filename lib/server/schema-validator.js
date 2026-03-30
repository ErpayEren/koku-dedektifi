const { cleanString } = require('./config');

function validateAnalysisPayload(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const name = cleanString(obj.name);
  const description = cleanString(obj.description);
  const intensity = Number(obj.intensity);
  const similar = Array.isArray(obj.similar) ? obj.similar : [];
  const molecules = Array.isArray(obj.molecules) ? obj.molecules : [];

  if (!name || !description) return false;
  if (!Number.isFinite(intensity) || intensity < 0 || intensity > 100) return false;
  if (similar.some((item) => typeof item !== 'string')) return false;
  if (molecules.some((item) => !item || typeof item !== 'object' || !cleanString(item.name))) return false;
  return true;
}

module.exports = {
  validateAnalysisPayload,
};
