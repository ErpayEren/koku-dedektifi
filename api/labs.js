const { cleanString } = require('../lib/server/supabase-config');

const routeMap = {
  'perfume-vote': require('../api_internal/perfume-vote'),
  'perfume-finder': require('../api_internal/perfume-finder'),
  'layering-lab': require('../api_internal/layering-lab'),
  'barcode-lookup': require('../api_internal/barcode-lookup'),
};

function pickRoute(req) {
  const query = req?.query && typeof req.query === 'object' ? req.query : {};
  const fromQuery = cleanString(query.r || query.route);
  if (fromQuery) return fromQuery;

  try {
    const url = new URL(req.url, 'http://localhost');
    return cleanString(url.searchParams.get('r') || url.searchParams.get('route'));
  } catch {
    return '';
  }
}

module.exports = async function labsRouter(req, res) {
  const route = pickRoute(req);
  const handler = routeMap[route];
  if (!handler) {
    return res.status(404).json({ error: 'Labs route not found', route });
  }
  return handler(req, res);
};
