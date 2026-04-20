const { cleanString } = require('../lib/server/supabase-config');

const routeMap = {
  auth: () => require('../api_internal/auth'),
  billing: () => require('../api_internal/billing'),
  'billing-webhook': () => require('../api_internal/billing-webhook'),
  feed: () => require('../api_internal/feed'),
  molecule: () => require('../api_internal/molecule'),
  proxy: () => require('../api_internal/proxy'),
  wardrobe: () => require('../api_internal/wardrobe'),
  health: () => require('../api_internal/health'),
  'schema-health': () => require('../api_internal/schema-health'),
  'catalog-health': () => require('../api_internal/catalog-health'),
  'catalog-seed': () => require('../api_internal/catalog-seed'),
  'catalog-import': () => require('../api_internal/catalog-import'),
  'catalog-backfill-evidence': () => require('../api_internal/catalog-backfill-evidence'),
  'weekly-molecule': () => require('../api_internal/weekly-molecule'),
  analyze: () => require('../api_internal/analyze'),
  analyses: () => require('../api_internal/analyses'),
  perfumes: () => require('../api_internal/perfumes'),
  'client-config': () => require('../api_internal/client-config'),
  event: () => require('../api_internal/event'),
  metrics: () => require('../api_internal/metrics'),
  'error-log': () => require('../api_internal/error-log'),
  'wardrobe-health': () => require('../api_internal/wardrobe-health'),
  'feed-health': () => require('../api_internal/feed-health'),
  'community-hub': () => require('../api_internal/community-hub'),
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
  const loadHandler = routeMap[route];
  if (!loadHandler) {
    return res.status(404).json({ error: 'Ops route not found', route });
  }
  const handler = loadHandler();
  return handler(req, res);
};
