const { createRuntimeStore } = require('../lib/server/runtime-store');

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

const METRIC_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 31;

const metricsStore = createRuntimeStore({
  cacheTtlMs: 45 * 24 * 60 * 60 * 1000,
  cacheMaxEntries: 4000,
  keyPrefix: 'koku-dedektifi-event',
});

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Metrics-Key');
    res.setHeader('Access-Control-Max-Age', '86400');
    return true;
  }

  if (!getAllowedOrigins(req).has(origin)) return false;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Metrics-Key');
  res.setHeader('Access-Control-Max-Age', '86400');
  return true;
}

function getDay(req) {
  const q = cleanString(req.query?.day);
  if (q && METRIC_DAY_RE.test(q)) return q;
  return new Date().toISOString().slice(0, 10);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(cleanString(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function shiftDay(day, offset) {
  const date = new Date(`${day}T00:00:00.000Z`);
  if (Number.isFinite(offset) && offset !== 0) {
    date.setUTCDate(date.getUTCDate() + offset);
  }
  return date.toISOString().slice(0, 10);
}

function getRange(req) {
  const anchorDay = getDay(req);
  const requested = parsePositiveInt(req.query?.days, 1);
  const days = Math.min(MAX_RANGE_DAYS, Math.max(1, requested));
  const startDay = shiftDay(anchorDay, -(days - 1));
  return { anchorDay, startDay, days };
}

function getEventCount(map, eventName) {
  return Number(map.get(eventName)?.count || 0);
}

function pct(part, total) {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function buildFunnel(eventMap) {
  const appOpen = getEventCount(eventMap, 'app_open');
  const analysisTriggered = getEventCount(eventMap, 'analysis_triggered');
  const analysisSucceeded = getEventCount(eventMap, 'analysis_succeeded');
  const advisorMessageSent = getEventCount(eventMap, 'advisor_message_sent');
  const authRegisterOk = getEventCount(eventMap, 'auth_register_ok');
  const authLoginOk = getEventCount(eventMap, 'auth_login_ok');
  const authProfileSaved = getEventCount(eventMap, 'auth_profile_saved');
  const authSessionRestored = getEventCount(eventMap, 'auth_session_restored');

  return {
    appOpen,
    analysisTriggered,
    analysisSucceeded,
    advisorMessageSent,
    authRegisterOk,
    authLoginOk,
    authProfileSaved,
    authSessionRestored,
    analysisSuccessFromTriggerPct: pct(analysisSucceeded, analysisTriggered),
    analysisTriggerFromOpenPct: pct(analysisTriggered, appOpen),
    registerFromOpenPct: pct(authRegisterOk, appOpen),
    profileSavedFromRegisterPct: pct(authProfileSaved, authRegisterOk),
    advisorFromOpenPct: pct(advisorMessageSent, appOpen),
    sessionRestoredFromOpenPct: pct(authSessionRestored, appOpen),
  };
}

function mergeBreakdownMaps(target, source) {
  const next = target && typeof target === 'object' && !Array.isArray(target) ? { ...target } : {};
  if (!source || typeof source !== 'object' || Array.isArray(source)) return next;

  for (const [propKey, counts] of Object.entries(source)) {
    if (!counts || typeof counts !== 'object' || Array.isArray(counts)) continue;
    const bucket = next[propKey] && typeof next[propKey] === 'object' && !Array.isArray(next[propKey])
      ? { ...next[propKey] }
      : {};

    for (const [value, count] of Object.entries(counts)) {
      bucket[value] = Number(bucket[value] || 0) + Number(count || 0);
    }

    next[propKey] = bucket;
  }

  return next;
}

function sortBreakdown(counts, limit = 5) {
  return Object.entries(counts || {})
    .map(([value, count]) => ({ value, count: Number(count || 0) }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, limit);
}

function getBreakdown(eventMap, eventName, propKey, limit = 5) {
  const counts = eventMap.get(eventName)?.breakdowns?.[propKey] || {};
  return sortBreakdown(counts, limit);
}

function buildBehavior(eventMap) {
  return {
    guidedFlows: getBreakdown(eventMap, 'guided_flow_opened', 'flow'),
    feedbackTypes: getBreakdown(eventMap, 'result_feedback_set', 'type'),
    shelfStates: getBreakdown(eventMap, 'shelf_state_set', 'status'),
    shelfFavorites: getBreakdown(eventMap, 'shelf_favorite_toggled', 'state'),
    shelfTags: getBreakdown(eventMap, 'shelf_tag_toggled', 'tag'),
    compareSources: getBreakdown(eventMap, 'compare_completed', 'source'),
  };
}

async function readDayMetrics(day) {
  const index = await metricsStore.getCache(`index:${day}`);
  const eventNames = Array.isArray(index?.events) ? index.events.slice(0, 200) : [];

  const rows = [];
  const eventMap = new Map();
  for (const eventName of eventNames) {
    const row = await metricsStore.getCache(`${day}:${eventName}`);
    if (!row) continue;
    const normalized = {
      event: eventName,
      count: Number(row.count || 0),
      firstAt: row.firstAt || null,
      lastAt: row.lastAt || null,
      breakdowns: row.breakdowns && typeof row.breakdowns === 'object' ? row.breakdowns : {},
    };
    rows.push(normalized);
    eventMap.set(eventName, normalized);
  }

  rows.sort((a, b) => b.count - a.count || a.event.localeCompare(b.event));
  const total = await metricsStore.getCache(`${day}:__total__`);
  return {
    day,
    total: Number(total?.count || 0),
    events: rows,
    eventMap,
  };
}

function isAuthorized(req) {
  const expected = cleanString(process.env.METRICS_API_KEY);
  if (!expected) return false;

  const fromHeader = cleanString(req.headers['x-metrics-key']);
  const fromQuery = cleanString(req.query?.key);
  const provided = fromHeader || fromQuery;
  return provided && provided === expected;
}

async function handler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res)) {
    return res.status(403).json({ error: 'Bu origin icin erisim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!cleanString(process.env.METRICS_API_KEY)) {
    return res.status(503).json({ error: 'METRICS_API_KEY ayarlanmamis.' });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Yetkisiz metrics erisimi.' });
  }

  const { anchorDay, startDay, days } = getRange(req);
  const series = [];
  for (let i = 0; i < days; i++) {
    const day = shiftDay(startDay, i);
    const dayMetrics = await readDayMetrics(day);
    series.push({
      day: dayMetrics.day,
      total: dayMetrics.total,
      events: dayMetrics.events,
    });
  }

  const aggregate = new Map();
  let total = 0;
  for (const dayMetrics of series) {
    total += Number(dayMetrics.total || 0);
    for (const row of dayMetrics.events) {
      const existing = aggregate.get(row.event) || {
        event: row.event,
        count: 0,
        firstAt: row.firstAt || null,
        lastAt: row.lastAt || null,
        breakdowns: {},
      };
      existing.count += Number(row.count || 0);
      if (row.firstAt && (!existing.firstAt || row.firstAt < existing.firstAt)) {
        existing.firstAt = row.firstAt;
      }
      if (row.lastAt && (!existing.lastAt || row.lastAt > existing.lastAt)) {
        existing.lastAt = row.lastAt;
      }
      existing.breakdowns = mergeBreakdownMaps(existing.breakdowns, row.breakdowns);
      aggregate.set(row.event, existing);
    }
  }

  const rows = Array.from(aggregate.values())
    .sort((a, b) => b.count - a.count || a.event.localeCompare(b.event));

  return res.status(200).json({
    day: anchorDay,
    total,
    events: rows,
    store: metricsStore.getBackendName(),
    range: {
      startDay,
      endDay: anchorDay,
      days,
    },
    funnel: buildFunnel(aggregate),
    behavior: buildBehavior(aggregate),
    series,
  });
}

module.exports = handler;
