const { createClient } = require('@supabase/supabase-js');
const { setCorsHeaders, setSecurityHeaders, cleanString } = require('../lib/server/config');
const { readAuthSession } = require('../lib/server/auth-session');
const { resolveSupabaseConfig } = require('../lib/server/supabase-config');
const { createRuntimeStore } = require('../lib/server/runtime-store');

const communityStore = createRuntimeStore({
  keyPrefix: 'koku-community-hub',
  cacheTtlMs: 45 * 24 * 60 * 60 * 1000,
  cacheMaxEntries: 300,
});

function getSupabaseClient() {
  const cfg = resolveSupabaseConfig();
  if (!cfg.url || !cfg.serviceRoleKey) return null;
  return createClient(cfg.url, cfg.serviceRoleKey, {
    auth: { persistSession: false },
  });
}

function getWeekKey(date = new Date()) {
  const current = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = current.getUTCDay() || 7;
  current.setUTCDate(current.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(current.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((current - yearStart) / 86400000) + 1) / 7);
  return `${current.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
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

function normalizeVoteName(value) {
  return cleanString(value).slice(0, 140);
}

async function loadTrendRows() {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('analyses')
    .select('result_json, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error || !Array.isArray(data)) return [];
  return data;
}

function buildTrends(rows) {
  const counts = new Map();

  for (const row of Array.isArray(rows) ? rows : []) {
    const name = cleanString(row?.result_json?.name || '');
    if (!name) continue;
    const entry = counts.get(name) || { name, count: 0, family: cleanString(row?.result_json?.family || '') };
    entry.count += 1;
    if (!entry.family) {
      entry.family = cleanString(row?.result_json?.family || '');
    }
    counts.set(name, entry);
  }

  return Array.from(counts.values())
    .sort((left, right) => right.count - left.count)
    .slice(0, 3);
}

async function readRuntimeVotes(weekKey) {
  const payload = await communityStore.getCache(`votes:${weekKey}`);
  return Array.isArray(payload?.votes) ? payload.votes : [];
}

async function writeRuntimeVotes(weekKey, votes) {
  await communityStore.setCache(`votes:${weekKey}`, {
    weekKey,
    votes,
    updatedAt: new Date().toISOString(),
  });
}

async function getVoteState(weekKey, authUserId, options) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    const runtimeVotes = await readRuntimeVotes(weekKey);
    const totals = options.map((option) => ({
      perfumeName: option,
      votes: runtimeVotes.filter((item) => item.perfume_name === option).length,
    }));
    const userVote = authUserId
      ? runtimeVotes.find((item) => item.user_id === authUserId)?.perfume_name || null
      : null;
    return { totals, userVote, source: 'runtime' };
  }

  const { data, error } = await supabase
    .from('community_votes')
    .select('user_id, perfume_name, week_key, created_at')
    .eq('week_key', weekKey);

  if (error || !Array.isArray(data)) {
    const runtimeVotes = await readRuntimeVotes(weekKey);
    const totals = options.map((option) => ({
      perfumeName: option,
      votes: runtimeVotes.filter((item) => item.perfume_name === option).length,
    }));
    const userVote = authUserId
      ? runtimeVotes.find((item) => item.user_id === authUserId)?.perfume_name || null
      : null;
    return { totals, userVote, source: 'runtime-fallback' };
  }

  const totals = options.map((option) => ({
    perfumeName: option,
    votes: data.filter((item) => cleanString(item.perfume_name) === option).length,
  }));
  const userVote = authUserId ? data.find((item) => item.user_id === authUserId)?.perfume_name || null : null;
  return { totals, userVote, source: 'supabase' };
}

function buildFallbackOptions(trends) {
  const options = trends.map((item) => item.name);
  const fallback = [
    'Dior Sauvage Eau de Parfum',
    'Creed Aventus',
    'Baccarat Rouge 540 Eau de Parfum',
  ];

  for (const item of fallback) {
    if (options.length >= 3) break;
    if (!options.includes(item)) options.push(item);
  }

  return options.slice(0, 3);
}

async function handleGet(req, res) {
  const auth = await readAuthSession(req);
  const weekKey = getWeekKey();
  const trends = buildTrends(await loadTrendRows());
  const options = buildFallbackOptions(trends);
  const voteState = await getVoteState(weekKey, auth?.user?.id || '', options);

  return res.status(200).json({
    ok: true,
    weekKey,
    trends,
    poll: {
      options,
      totals: voteState.totals,
      userVote: voteState.userVote,
      source: voteState.source,
    },
  });
}

async function handlePost(req, res) {
  const auth = await readAuthSession(req);
  if (!auth?.user?.id) {
    return res.status(401).json({ error: 'Oy kullanmak için giriş yapmalısın.' });
  }

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Geçersiz JSON gövdesi.' });

  const perfumeName = normalizeVoteName(body?.perfumeName || body?.name);
  if (!perfumeName) {
    return res.status(400).json({ error: 'Parfüm adı gerekli.' });
  }

  const weekKey = getWeekKey();
  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase
      .from('community_votes')
      .upsert(
        {
          user_id: auth.user.id,
          perfume_name: perfumeName,
          week_key: weekKey,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,week_key',
        },
      );

    if (!error) {
      return handleGet(req, res);
    }
  }

  const runtimeVotes = await readRuntimeVotes(weekKey);
  const nextVotes = runtimeVotes.filter((item) => item.user_id !== auth.user.id);
  nextVotes.push({
    user_id: auth.user.id,
    perfume_name: perfumeName,
    week_key: weekKey,
    created_at: new Date().toISOString(),
  });
  await writeRuntimeVotes(weekKey, nextVotes);

  return handleGet(req, res);
}

module.exports = async function communityHubHandler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res, { methods: 'GET, POST, OPTIONS', headers: 'Content-Type, Authorization' })) {
    return res.status(403).json({ error: 'Bu origin için erişim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handlePost(req, res);
  return res.status(405).json({ error: 'Method not allowed' });
};
