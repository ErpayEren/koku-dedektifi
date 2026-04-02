const { cleanString } = require('../lib/server/supabase-config');

const routeMap = {
  health: require('../api_internal/health'),
  'catalog-health': require('../api_internal/catalog-health'),
  'weekly-molecule': require('../api_internal/weekly-molecule'),
  'client-config': require('../api_internal/client-config'),
  event: require('../api_internal/event'),
  metrics: require('../api_internal/metrics'),
  'error-log': require('../api_internal/error-log'),
  'wardrobe-health': require('../api_internal/wardrobe-health'),
  'feed-health': require('../api_internal/feed-health'),
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

module.exports = async function opsRouter(req, res) {
  const route = pickRoute(req);
  const handler = routeMap[route];
  if (!handler) {
    return res.status(404).json({ error: 'Ops route not found', route });
  }
  return handler(req, res);
};
