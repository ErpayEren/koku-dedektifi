const {
  cleanString,
  hasSupabaseServiceConfig,
  resolveSupabaseConfig,
} = require('../lib/server/supabase-config');
const {
  setCorsHeaders,
  setSecurityHeaders,
} = require('../lib/server/config');

function parseContentRangeTotal(value) {
  const raw = cleanString(value);
  if (!raw.includes('/')) return 0;
  const total = Number.parseInt(raw.split('/').pop() || '0', 10);
  return Number.isFinite(total) ? total : 0;
}

async function probeTable(config, table, selectColumn = '*') {
  const url = `${config.url}/rest/v1/${encodeURIComponent(table)}?select=${encodeURIComponent(selectColumn)}&limit=1`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'count=exact',
      Range: '0-0',
      'Range-Unit': 'items',
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    return {
      ok: false,
      status: response.status,
      count: 0,
      reason: cleanString(body) || `supabase_http_${response.status}`,
    };
  }

  return {
    ok: true,
    status: response.status,
    count: parseContentRangeTotal(response.headers.get('content-range')),
    reason: '',
  };
}

module.exports = async function schemaHealthHandler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res, { methods: 'GET, OPTIONS', headers: 'Content-Type' })) {
    return res.status(403).json({ error: 'Bu origin için erişim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = resolveSupabaseConfig();
  const configured = hasSupabaseServiceConfig();
  const checks = {
    users: { ok: false, status: 0, count: 0, reason: configured ? 'skipped' : 'supabase_missing' },
    analyses: { ok: false, status: 0, count: 0, reason: configured ? 'skipped' : 'supabase_missing' },
    wardrobe: { ok: false, status: 0, count: 0, reason: configured ? 'skipped' : 'supabase_missing' },
    community_votes: { ok: false, status: 0, count: 0, reason: configured ? 'skipped' : 'supabase_missing' },
  };

  if (configured) {
    try {
      const [users, analyses, wardrobe, communityVotes] = await Promise.all([
        probeTable(supabase, 'users', 'id'),
        probeTable(supabase, 'analyses', 'id'),
        probeTable(supabase, 'wardrobe', 'id'),
        probeTable(supabase, 'community_votes', 'id'),
      ]);

      checks.users = users;
      checks.analyses = analyses;
      checks.wardrobe = wardrobe;
      checks.community_votes = communityVotes;
    } catch (error) {
      const reason = cleanString(error?.message) || 'schema_probe_failed';
      checks.users.reason = reason;
      checks.analyses.reason = reason;
      checks.wardrobe.reason = reason;
      checks.community_votes.reason = reason;
    }
  }

  const envChecks = {
    anthropicApiKey: Boolean(cleanString(process.env.ANTHROPIC_API_KEY)),
    nextPublicSupabaseUrl: Boolean(cleanString(process.env.NEXT_PUBLIC_SUPABASE_URL) || cleanString(process.env.SUPABASE_URL)),
    nextPublicSupabaseAnonKey: Boolean(cleanString(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)),
    supabaseServiceRoleKey: Boolean(cleanString(process.env.SUPABASE_SERVICE_ROLE_KEY) || cleanString(process.env.SUPABASE_SERVICE_KEY)),
    nextAuthSecret: Boolean(cleanString(process.env.NEXTAUTH_SECRET)),
    nextAuthUrl: Boolean(cleanString(process.env.NEXTAUTH_URL)),
  };

  const ready = Object.values(checks).every((item) => item.ok);

  return res.status(200).json({
    ok: true,
    ready,
    tables: checks,
    env: envChecks,
    ts: new Date().toISOString(),
  });
};
