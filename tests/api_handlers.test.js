const crypto = require('crypto');
const assert = require('node:assert/strict');

process.env.KV_REST_API_URL = '';
process.env.KV_REST_API_TOKEN = '';
process.env.UPSTASH_REDIS_REST_URL = '';
process.env.UPSTASH_REDIS_REST_TOKEN = '';
process.env.METRICS_API_KEY = 'test-metrics-key';
process.env.BILLING_CHECKOUT_URL_PRO = 'https://checkout.example/pro';
process.env.BILLING_ALLOW_DEV_ACTIVATION = 'true';
process.env.BILLING_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.NODE_ENV = 'test';
process.env.API_STATE_FILE = `.runtime/test-api-store-${process.pid}.json`;

const healthHandler = require('../api_internal/health');
const clientConfigHandler = require('../api_internal/client-config');
const eventHandler = require('../api_internal/event');
const metricsHandler = require('../api_internal/metrics');
const moleculeHandler = require('../api/molecule');
const proxyHandler = require('../api/proxy');
const authHandler = require('../api/auth');
const billingHandler = require('../api/billing');
const billingWebhookHandler = require('../api/billing-webhook');
const wardrobeHandler = require('../api/wardrobe');
const wardrobeHealthHandler = require('../api_internal/wardrobe-health');
const errorLogHandler = require('../api_internal/error-log');
const perfumeVoteHandler = require('../api_internal/perfume-vote');
const perfumeFinderHandler = require('../api_internal/perfume-finder');
const layeringLabHandler = require('../api_internal/layering-lab');
const feedHandler = require('../api/feed');
const feedHealthHandler = require('../api_internal/feed-health');
const barcodeLookupHandler = require('../api_internal/barcode-lookup');
const { buildAdvisorRagContext } = require('../lib/server/advisor-rag');
const { enrichAnalysisResult, deriveMoleculesFromPyramid } = require('../lib/server/perfume-knowledge');
const { writeEntitlementForUser } = require('../lib/server/billing-store');

let requestCounter = 0;

function createRes() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    ended: false,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return payload;
    },
    end() {
      this.ended = true;
      return null;
    },
  };
}

function buildReq(method, body = null, extras = {}) {
  requestCounter += 1;
  const req = {
    method,
    headers: {
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
    },
    body,
    query: {},
    socket: {
      remoteAddress: `127.0.0.${(requestCounter % 200) + 1}`,
    },
  };

  if (extras && typeof extras === 'object') {
    if (extras.headers && typeof extras.headers === 'object') {
      req.headers = { ...req.headers, ...extras.headers };
    }
    if (extras.query && typeof extras.query === 'object') {
      req.query = { ...req.query, ...extras.query };
    }
    if (extras.socket && typeof extras.socket === 'object') {
      req.socket = { ...req.socket, ...extras.socket };
    }
  }

  return req;
}

function uniqueEmail() {
  return `qa+${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}@example.com`;
}

function getSetCookie(res) {
  const raw = res.headers['Set-Cookie'];
  if (Array.isArray(raw)) return String(raw[0] || '');
  return typeof raw === 'string' ? raw : '';
}

function getAuthHeadersFromResponse(res) {
  const cookie = getSetCookie(res);
  assert.equal(cookie.includes('kd_token='), true);
  return { cookie };
}

async function registerProUser(name, password = 'ProUserPass123!') {
  const email = uniqueEmail();
  const registerReq = buildReq('POST', {
    action: 'register',
    name,
    email,
    password,
  });
  const registerRes = createRes();
  await authHandler(registerReq, registerRes);
  assert.equal(registerRes.statusCode, 201);

  await writeEntitlementForUser(registerRes.body.user.id, {
    tier: 'pro',
    status: 'active',
    source: 'test-suite',
    checkoutPlanId: 'pro',
  });

  return {
    email,
    password,
    userId: registerRes.body.user.id,
    authHeaders: getAuthHeadersFromResponse(registerRes),
  };
}

function signBillingPayload(rawBody) {
  const digest = crypto
    .createHmac('sha256', process.env.BILLING_WEBHOOK_SECRET)
    .update(String(rawBody), 'utf8')
    .digest('hex');
  return `sha256=${digest}`;
}

function signStripePayload(rawBody, timestamp = Math.floor(Date.now() / 1000)) {
  const digest = crypto
    .createHmac('sha256', process.env.BILLING_WEBHOOK_SECRET)
    .update(`${timestamp}.${String(rawBody)}`, 'utf8')
    .digest('hex');
  return `t=${timestamp},v1=${digest}`;
}

function signPaddlePayload(rawBody, timestamp = Math.floor(Date.now() / 1000)) {
  const digest = crypto
    .createHmac('sha256', process.env.BILLING_WEBHOOK_SECRET)
    .update(`${timestamp}:${String(rawBody)}`, 'utf8')
    .digest('hex');
  return `ts=${timestamp};h1=${digest}`;
}

test('health endpoint responds ok and includes checks', async () => {
  const req = buildReq('GET');
  const res = createRes();
  await healthHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(typeof res.body.checks, 'object');
  assert.equal(Boolean(res.body.checks.storeBackend), true);
});

test('wardrobe health endpoint exposes supabase diagnostics', async () => {
  const prevRequire = process.env.WARDROBE_REQUIRE_SUPABASE;
  const prevFallback = process.env.WARDROBE_ALLOW_RUNTIME_FALLBACK;
  process.env.WARDROBE_REQUIRE_SUPABASE = 'false';
  process.env.WARDROBE_ALLOW_RUNTIME_FALLBACK = 'true';

  const req = buildReq('GET');
  const res = createRes();
  await wardrobeHealthHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(typeof res.body.checks, 'object');
  assert.equal(typeof res.body.checks.supabaseConfigured, 'boolean');
  assert.equal(typeof res.body.checks.runtimeFallbackAllowed, 'boolean');

  if (typeof prevRequire === 'string') process.env.WARDROBE_REQUIRE_SUPABASE = prevRequire;
  else delete process.env.WARDROBE_REQUIRE_SUPABASE;
  if (typeof prevFallback === 'string') process.env.WARDROBE_ALLOW_RUNTIME_FALLBACK = prevFallback;
  else delete process.env.WARDROBE_ALLOW_RUNTIME_FALLBACK;
});

test('feed health endpoint exposes supabase diagnostics', async () => {
  const prevRequire = process.env.FEED_REQUIRE_SUPABASE;
  const prevFallback = process.env.FEED_ALLOW_RUNTIME_FALLBACK;
  process.env.FEED_REQUIRE_SUPABASE = 'false';
  process.env.FEED_ALLOW_RUNTIME_FALLBACK = 'true';

  const req = buildReq('GET');
  const res = createRes();
  await feedHealthHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(typeof res.body.checks, 'object');
  assert.equal(typeof res.body.checks.supabaseConfigured, 'boolean');
  assert.equal(typeof res.body.checks.runtimeFallbackAllowed, 'boolean');

  if (typeof prevRequire === 'string') process.env.FEED_REQUIRE_SUPABASE = prevRequire;
  else delete process.env.FEED_REQUIRE_SUPABASE;
  if (typeof prevFallback === 'string') process.env.FEED_ALLOW_RUNTIME_FALLBACK = prevFallback;
  else delete process.env.FEED_ALLOW_RUNTIME_FALLBACK;
});

test('wardrobe endpoint blocks runtime-store fallback in strict mode when Supabase is missing', async () => {
  const prevRequire = process.env.WARDROBE_REQUIRE_SUPABASE;
  const prevFallback = process.env.WARDROBE_ALLOW_RUNTIME_FALLBACK;
  const prevSupabaseUrl = process.env.SUPABASE_URL;
  const prevSupabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.WARDROBE_REQUIRE_SUPABASE = 'true';
  process.env.WARDROBE_ALLOW_RUNTIME_FALLBACK = 'true';
  process.env.SUPABASE_URL = '';
  process.env.SUPABASE_SERVICE_ROLE_KEY = '';

  try {
    const email = uniqueEmail();
    const password = 'StrictWardrobePass123!';

    const registerReq = buildReq('POST', {
      action: 'register',
      name: 'Strict Wardrobe User',
      email,
      password,
    });
    const registerRes = createRes();
    await authHandler(registerReq, registerRes);
    assert.equal(registerRes.statusCode, 201);

    const req = buildReq('GET', null, {
      headers: getAuthHeadersFromResponse(registerRes),
    });
    const res = createRes();
    await wardrobeHandler(req, res);

    assert.equal(res.statusCode, 503);
    assert.equal(res.body.code, 'wardrobe_store_unavailable');
    assert.equal(res.body.diagnostics.required, true);
    assert.equal(res.body.diagnostics.runtimeFallbackAllowed, false);
    assert.equal(res.body.diagnostics.supabaseConfigured, false);
  } finally {
    if (typeof prevRequire === 'string') process.env.WARDROBE_REQUIRE_SUPABASE = prevRequire;
    else delete process.env.WARDROBE_REQUIRE_SUPABASE;
    if (typeof prevFallback === 'string') process.env.WARDROBE_ALLOW_RUNTIME_FALLBACK = prevFallback;
    else delete process.env.WARDROBE_ALLOW_RUNTIME_FALLBACK;
    if (typeof prevSupabaseUrl === 'string') process.env.SUPABASE_URL = prevSupabaseUrl;
    else delete process.env.SUPABASE_URL;
    if (typeof prevSupabaseServiceRole === 'string') process.env.SUPABASE_SERVICE_ROLE_KEY = prevSupabaseServiceRole;
    else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
});

test('client-config endpoint exposes safe error tracking config', async () => {
  const prevDsn = process.env.SENTRY_DSN;
  const prevEnv = process.env.SENTRY_ENVIRONMENT;
  const prevRate = process.env.SENTRY_TRACES_SAMPLE_RATE;
  process.env.SENTRY_DSN = 'https://publickey@o0.ingest.sentry.io/123456';
  process.env.SENTRY_ENVIRONMENT = 'production';
  process.env.SENTRY_TRACES_SAMPLE_RATE = '0.12';

  const req = buildReq('GET');
  const res = createRes();
  await clientConfigHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.config.errorTracking.provider, 'sentry');
  assert.equal(typeof res.body.config.errorTracking.sentryDsn, 'string');
  assert.equal(res.body.config.errorTracking.sentryDsn.includes('publickey@'), true);
  assert.equal(res.body.config.errorTracking.environment, 'production');
  assert.equal(res.body.config.errorTracking.tracesSampleRate, 0.12);

  if (typeof prevDsn === 'string') process.env.SENTRY_DSN = prevDsn;
  else delete process.env.SENTRY_DSN;
  if (typeof prevEnv === 'string') process.env.SENTRY_ENVIRONMENT = prevEnv;
  else delete process.env.SENTRY_ENVIRONMENT;
  if (typeof prevRate === 'string') process.env.SENTRY_TRACES_SAMPLE_RATE = prevRate;
  else delete process.env.SENTRY_TRACES_SAMPLE_RATE;
});

test('event endpoint rejects invalid event name', async () => {
  const req = buildReq('POST', { event: '!!!', props: {} });
  const res = createRes();
  await eventHandler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(typeof res.body.error, 'string');
});

test('event endpoint accepts a valid event', async () => {
  const req = buildReq('POST', { event: 'analysis_started', props: { input: 'text' } });
  const res = createRes();
  await eventHandler(req, res);

  assert.equal(res.statusCode, 202);
  assert.equal(res.body.ok, true);
});

test('metrics endpoint returns daily aggregates when authorized', async () => {
  const emitReq = buildReq('POST', { event: 'metrics_probe_event', props: { source: 'test' } });
  const emitRes = createRes();
  await eventHandler(emitReq, emitRes);
  assert.equal(emitRes.statusCode, 202);

  const today = new Date().toISOString().slice(0, 10);
  const req = buildReq('GET');
  req.query = { day: today };
  req.headers['x-metrics-key'] = 'test-metrics-key';

  const res = createRes();
  await metricsHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(Array.isArray(res.body.events), true);
  assert.equal(typeof res.body.total, 'number');
});

test('metrics endpoint supports range + funnel fields', async () => {
  const events = ['app_open', 'analysis_triggered', 'analysis_succeeded', 'auth_register_ok'];
  for (const eventName of events) {
    const req = buildReq('POST', { event: eventName, props: { source: 'range-test' } });
    const res = createRes();
    await eventHandler(req, res);
    assert.equal(res.statusCode, 202);
  }

  const req = buildReq('GET');
  req.query = { days: '3' };
  req.headers['x-metrics-key'] = 'test-metrics-key';
  const res = createRes();
  await metricsHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.range.days, 3);
  assert.equal(Array.isArray(res.body.series), true);
  assert.equal(res.body.series.length, 3);
  assert.equal(typeof res.body.funnel.analysisSuccessFromTriggerPct, 'number');
  assert.equal(typeof res.body.funnel.registerFromOpenPct, 'number');
});

test('metrics endpoint returns behavior breakdowns', async () => {
  const events = [
    { event: 'guided_flow_opened', props: { flow: 'gift' } },
    { event: 'guided_flow_opened', props: { flow: 'gift' } },
    { event: 'result_feedback_set', props: { type: 'accurate' } },
    { event: 'shelf_state_set', props: { status: 'owned' } },
    { event: 'shelf_tag_toggled', props: { tag: 'office' } },
    { event: 'compare_completed', props: { source: 'stored' } },
  ];

  for (const payload of events) {
    const req = buildReq('POST', payload);
    const res = createRes();
    await eventHandler(req, res);
    assert.equal(res.statusCode, 202);
  }

  const req = buildReq('GET');
  req.headers['x-metrics-key'] = 'test-metrics-key';
  const res = createRes();
  await metricsHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(Array.isArray(res.body.behavior.guidedFlows), true);
  assert.equal(res.body.behavior.guidedFlows[0].value, 'gift');
  assert.equal(res.body.behavior.feedbackTypes[0].value, 'accurate');
  assert.equal(res.body.behavior.shelfStates[0].value, 'owned');
});

test('perfume knowledge enriches official perfumes and derives molecules from notes', async () => {
  const enriched = enrichAnalysisResult({
    name: 'Baccarat Rouge 540',
    family: '',
    pyramid: null,
    molecules: [],
    similar: [],
    technical: [],
  });

  assert.equal(enriched.verification.matchedPerfume, 'Baccarat Rouge 540 Eau de Parfum');
  assert.equal(enriched.verification.noteSource, 'official');
  assert.equal(enriched.verification.moleculeSource, 'official-derived');
  assert.equal(Array.isArray(enriched.sourceTrace), true);
  assert.ok(enriched.sourceTrace.length >= 1);
  assert.ok(enriched.molecules.some((item) => String(item.name).toLowerCase() === 'safranal'));

  const derived = deriveMoleculesFromPyramid({
    top: ['Bergamot'],
    middle: ['Jasmine'],
    base: ['Vanilla'],
  });
  assert.ok(derived.some((item) => String(item.name).toLowerCase() === 'limonene'));
  assert.ok(derived.some((item) => String(item.name).toLowerCase() === 'hedione'));
  assert.ok(derived.some((item) => String(item.name).toLowerCase() === 'vanillin'));

  const blackOrchid = enrichAnalysisResult({
    name: 'Black Orchid',
    family: '',
    pyramid: null,
    molecules: [],
    similar: [],
    technical: [],
  });
  assert.equal(blackOrchid.verification.matchedPerfume, 'TOM FORD Black Orchid Eau de Parfum');
  assert.ok(blackOrchid.molecules.some((item) => String(item.name).toLowerCase() === 'patchouli alcohol'));
});

test('molecule endpoint resolves known molecules', async () => {
  const req = buildReq('POST', { names: ['Linalool'] });
  const res = createRes();
  await moleculeHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(Array.isArray(res.body.molecules), true);
  assert.equal(res.body.molecules.length, 1);
  assert.equal(res.body.molecules[0].name.toLowerCase(), 'linalool');
});

test('proxy endpoint validates empty message list', async () => {
  const req = buildReq('POST', { promptType: 'analysis', messages: [] });
  const res = createRes();
  await proxyHandler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(typeof res.body.error, 'string');
  assert.equal(Boolean(res.headers['Content-Security-Policy']), true);
});

test('wardrobe endpoint supports cross-device shelf sync', async () => {
  const email = uniqueEmail();
  const password = 'WardrobePass123!';

  const registerReq = buildReq('POST', {
    action: 'register',
    name: 'Wardrobe User',
    email,
    password,
  });
  const registerRes = createRes();
  await authHandler(registerReq, registerRes);
  assert.equal(registerRes.statusCode, 201);

  const authHeaders = getAuthHeadersFromResponse(registerRes);

  const getBeforeReq = buildReq('GET', null, { headers: authHeaders });
  const getBeforeRes = createRes();
  await wardrobeHandler(getBeforeReq, getBeforeRes);
  assert.equal(getBeforeRes.statusCode, 200);
  assert.equal(getBeforeRes.body.ok, true);
  assert.equal(typeof getBeforeRes.body.shelf, 'object');

  const shelfPayload = {
    'creed aventus': {
      name: 'Creed Aventus',
      emoji: '🌿',
      family: 'Odunsu',
      status: 'owned',
      favorite: true,
      tags: ['office', 'night'],
      updatedAt: new Date().toISOString(),
      analysis: {
        name: 'Creed Aventus',
        family: 'Odunsu',
      },
    },
  };

  const putReq = buildReq('PUT', { shelf: shelfPayload }, { headers: authHeaders });
  const putRes = createRes();
  await wardrobeHandler(putReq, putRes);
  assert.equal(putRes.statusCode, 200);
  assert.equal(putRes.body.ok, true);
  assert.equal(Boolean(putRes.body.shelf['creed aventus']), true);

  const getAfterReq = buildReq('GET', null, { headers: authHeaders });
  const getAfterRes = createRes();
  await wardrobeHandler(getAfterReq, getAfterRes);
  assert.equal(getAfterRes.statusCode, 200);
  assert.equal(getAfterRes.body.shelf['creed aventus'].status, 'owned');
  assert.equal(getAfterRes.body.shelf['creed aventus'].favorite, true);
});

test('feed endpoint supports authenticated cloud sync payload', async () => {
  const email = uniqueEmail();
  const password = 'FeedPass123!';

  const registerReq = buildReq('POST', {
    action: 'register',
    name: 'Feed User',
    email,
    password,
  });
  const registerRes = createRes();
  await authHandler(registerReq, registerRes);
  assert.equal(registerRes.statusCode, 201);

  const authHeaders = getAuthHeadersFromResponse(registerRes);

  const feedPayload = [
    {
      id: 'evt-1',
      event: 'analysis_done',
      payload: { perfume: 'Creed Aventus', detail: 'Analiz sonucu olustu' },
      ts: new Date().toISOString(),
    },
  ];

  const putReq = buildReq('PUT', { feed: feedPayload }, { headers: authHeaders });
  const putRes = createRes();
  await feedHandler(putReq, putRes);
  assert.equal(putRes.statusCode, 200);
  assert.equal(putRes.body.ok, true);
  assert.equal(Array.isArray(putRes.body.feed), true);
  assert.equal(putRes.body.feed.length >= 1, true);

  const getReq = buildReq('GET', null, { headers: authHeaders });
  const getRes = createRes();
  await feedHandler(getReq, getRes);
  assert.equal(getRes.statusCode, 200);
  assert.equal(getRes.body.ok, true);
  assert.equal(Array.isArray(getRes.body.feed), true);
  assert.equal(getRes.body.feed.some((row) => row.event === 'analysis_done'), true);
});

test('barcode lookup endpoint resolves known barcode and handles unknown codes', async () => {
  const session = await registerProUser('Barcode Pro User');

  const hitReq = buildReq('GET', null, {
    query: { code: '3348901520196' },
    headers: session.authHeaders,
  });
  const hitRes = createRes();
  await barcodeLookupHandler(hitReq, hitRes);
  assert.equal(hitRes.statusCode, 200);
  assert.equal(hitRes.body.ok, true);
  assert.equal(hitRes.body.found, true);
  assert.equal(typeof hitRes.body.perfume, 'string');
  assert.equal(hitRes.body.perfume.length > 3, true);

  const missReq = buildReq('GET', null, {
    query: { code: '0000000000000' },
    headers: session.authHeaders,
  });
  const missRes = createRes();
  await barcodeLookupHandler(missReq, missRes);
  assert.equal(missRes.statusCode, 200);
  assert.equal(missRes.body.ok, true);
  assert.equal(missRes.body.found, false);
});

test('perfume vote endpoint stores and aggregates community pulse', async () => {
  const postReq = buildReq('POST', {
    perfume: 'Creed Aventus',
    longevity: 'strong',
    sillage: 'loud',
  });
  const postRes = createRes();
  await perfumeVoteHandler(postReq, postRes);
  assert.equal(postRes.statusCode, 200);
  assert.equal(postRes.body.ok, true);

  const getReq = buildReq('GET', null, {
    query: { perfume: 'Creed Aventus' },
  });
  const getRes = createRes();
  await perfumeVoteHandler(getReq, getRes);

  assert.equal(getRes.statusCode, 200);
  assert.equal(getRes.body.ok, true);
  assert.equal(getRes.body.perfume, 'Creed Aventus');
  assert.equal(getRes.body.total >= 1, true);
  assert.equal(typeof getRes.body.longevity?.pct?.strong, 'number');
  assert.equal(typeof getRes.body.sillage?.pct?.loud, 'number');
});

test('perfume finder endpoint returns ranked candidates by notes', async () => {
  const req = buildReq('POST', {
    includeNotes: 'bergamot, lavender',
    excludeNotes: 'caramel',
    maxSweetness: 70,
    limit: 6,
  });
  const res = createRes();
  await perfumeFinderHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(Array.isArray(res.body.candidates), true);
  assert.equal(res.body.candidates.length > 0, true);
  assert.equal(typeof res.body.candidates[0].name, 'string');
  assert.equal(typeof res.body.candidates[0].score, 'number');
});

test('layering lab endpoint returns blend analysis for known perfumes', async () => {
  const session = await registerProUser('Layering Pro User');
  const req = buildReq('POST', {
    left: 'Creed Aventus',
    right: 'Dior Sauvage',
  }, {
    headers: session.authHeaders,
  });
  const res = createRes();
  await layeringLabHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(typeof res.body.blend?.compatibility, 'number');
  assert.equal(typeof res.body.result?.name, 'string');
  assert.equal(typeof res.body.result?.layering?.pair, 'string');
  assert.equal(res.body.result.layering.pair.includes('+'), true);
});

test('client error log endpoint stores and lists rows', async () => {
  const postReq = buildReq('POST', {
    level: 'error',
    message: 'ui_render_failed',
    context: { stage: 'unit-test', retry: false },
    url: 'https://koku-dedektifi.vercel.app',
  });
  const postRes = createRes();
  await errorLogHandler(postReq, postRes);
  assert.equal(postRes.statusCode, 202);
  assert.equal(postRes.body.ok, true);

  const day = new Date().toISOString().slice(0, 10);
  const getReq = buildReq('GET', null, {
    headers: { 'x-metrics-key': 'test-metrics-key' },
    query: { day },
  });
  const getRes = createRes();
  await errorLogHandler(getReq, getRes);
  assert.equal(getRes.statusCode, 200);
  assert.equal(typeof getRes.body.total, 'number');
  assert.equal(Array.isArray(getRes.body.rows), true);
  assert.equal(getRes.body.total >= 1, true);
});

test('advisor RAG builds local retrieval context without vector db', async () => {
  process.env.RAG_ENABLE_VECTOR = 'false';
  process.env.PINECONE_INDEX_HOST = '';
  process.env.PINECONE_API_KEY = '';

  const context = await buildAdvisorRagContext({
    messages: [{ role: 'user', content: 'Dior Sauvage benzer profilinde kalici bir parfum oner' }],
  });

  assert.equal(context.meta.enabled, true);
  assert.equal(typeof context.promptBlock, 'string');
  assert.equal(context.promptBlock.includes('ADAYLAR'), true);
  assert.equal(Array.isArray(context.meta.sources), true);
  assert.equal(context.meta.sources.length >= 1, true);
});

test('auth endpoint supports register -> me -> patch -> logout flow', async () => {
  const email = uniqueEmail();
  const password = 'SuperSecret123!';

  const registerReq = buildReq('POST', {
    action: 'register',
    name: 'Test User',
    email,
    password,
  });
  const registerRes = createRes();
  await authHandler(registerReq, registerRes);

  assert.equal(registerRes.statusCode, 201);
  assert.equal(getSetCookie(registerRes).includes('kd_token='), true);
  assert.equal(registerRes.body.user.email, email);
  assert.equal(registerRes.body.user.name, 'Test User');

  const authHeader = getAuthHeadersFromResponse(registerRes);

  const meReq = buildReq('GET', null, { headers: authHeader });
  const meRes = createRes();
  await authHandler(meReq, meRes);

  assert.equal(meRes.statusCode, 200);
  assert.equal(meRes.body.user.email, email);

  const patchReq = buildReq(
    'PATCH',
    {
      profile: {
        displayName: 'Tester',
        city: 'Istanbul',
        budgetBand: '800-2000',
        gender: 'unisex',
        favoriteFamilies: ['fresh', 'woody'],
      },
    },
    { headers: authHeader },
  );
  const patchRes = createRes();
  await authHandler(patchReq, patchRes);

  assert.equal(patchRes.statusCode, 200);
  assert.equal(patchRes.body.user.profile.displayName, 'Tester');
  assert.equal(patchRes.body.user.profile.city, 'Istanbul');
  assert.equal(patchRes.body.user.profile.gender, 'unisex');
  assert.deepEqual(patchRes.body.user.profile.favoriteFamilies, ['fresh', 'woody']);

  const logoutReq = buildReq('POST', { action: 'logout' }, { headers: authHeader });
  const logoutRes = createRes();
  await authHandler(logoutReq, logoutRes);

  assert.equal(logoutRes.statusCode, 200);
  assert.equal(logoutRes.body.ok, true);

  const meAfterLogoutReq = buildReq('GET', null, { headers: authHeader });
  const meAfterLogoutRes = createRes();
  await authHandler(meAfterLogoutReq, meAfterLogoutRes);
  assert.equal(meAfterLogoutRes.statusCode, 401);
});

test('auth endpoint rejects duplicate register and supports login', async () => {
  const email = uniqueEmail();
  const password = 'AnotherPass123!';

  const firstRegisterReq = buildReq('POST', {
    action: 'register',
    name: 'First User',
    email,
    password,
  });
  const firstRegisterRes = createRes();
  await authHandler(firstRegisterReq, firstRegisterRes);
  assert.equal(firstRegisterRes.statusCode, 201);

  const duplicateRegisterReq = buildReq('POST', {
    action: 'register',
    name: 'Second User',
    email,
    password,
  });
  const duplicateRegisterRes = createRes();
  await authHandler(duplicateRegisterReq, duplicateRegisterRes);
  assert.equal(duplicateRegisterRes.statusCode, 409);

  const loginReq = buildReq('POST', {
    action: 'login',
    email,
    password,
  });
  const loginRes = createRes();
  await authHandler(loginReq, loginRes);

  assert.equal(loginRes.statusCode, 200);
  assert.equal(getSetCookie(loginRes).includes('kd_token='), true);
  assert.equal(loginRes.body.user.email, email);
});

test('billing endpoint returns plans and supports authenticated checkout', async () => {
  const email = uniqueEmail();
  const password = 'BillingPass123!';

  const registerReq = buildReq('POST', {
    action: 'register',
    name: 'Billing User',
    email,
    password,
  });
  const registerRes = createRes();
  await authHandler(registerReq, registerRes);
  assert.equal(registerRes.statusCode, 201);
  const authHeaders = getAuthHeadersFromResponse(registerRes);

  const publicReq = buildReq('GET');
  const publicRes = createRes();
  await billingHandler(publicReq, publicRes);
  assert.equal(publicRes.statusCode, 200);
  assert.equal(Array.isArray(publicRes.body.plans), true);
  assert.equal(publicRes.body.plans.some((plan) => plan.id === 'studio'), false);
  assert.equal(publicRes.body.entitlement.tier, 'free');

  const noAuthCheckoutReq = buildReq('POST', { action: 'start_checkout', planId: 'pro' });
  const noAuthCheckoutRes = createRes();
  await billingHandler(noAuthCheckoutReq, noAuthCheckoutRes);
  assert.equal(noAuthCheckoutRes.statusCode, 401);

  const authCheckoutReq = buildReq(
    'POST',
    { action: 'start_checkout', planId: 'pro' },
    { headers: authHeaders },
  );
  const authCheckoutRes = createRes();
  await billingHandler(authCheckoutReq, authCheckoutRes);
  assert.equal(authCheckoutRes.statusCode, 200);
  assert.equal(typeof authCheckoutRes.body.checkoutUrl, 'string');
  assert.equal(authCheckoutRes.body.checkoutUrl.includes('pid=pro'), true);

  const activateReq = buildReq(
    'POST',
    { action: 'activate_dev_plan', planId: 'pro' },
    { headers: authHeaders },
  );
  const activateRes = createRes();
  await billingHandler(activateReq, activateRes);
  assert.equal(activateRes.statusCode, 200);
  assert.equal(activateRes.body.entitlement.tier, 'pro');

  const authGetReq = buildReq('GET', null, { headers: authHeaders });
  const authGetRes = createRes();
  await billingHandler(authGetReq, authGetRes);
  assert.equal(authGetRes.statusCode, 200);
  assert.equal(authGetRes.body.entitlement.tier, 'pro');
});

test('billing endpoint can create stripe checkout session when configured', async () => {
  const originalEnv = {
    BILLING_PROVIDER: process.env.BILLING_PROVIDER,
    BILLING_STRIPE_SECRET_KEY: process.env.BILLING_STRIPE_SECRET_KEY,
    BILLING_STRIPE_PRICE_ID_PRO: process.env.BILLING_STRIPE_PRICE_ID_PRO,
    BILLING_STRIPE_SUCCESS_URL: process.env.BILLING_STRIPE_SUCCESS_URL,
    BILLING_STRIPE_CANCEL_URL: process.env.BILLING_STRIPE_CANCEL_URL,
  };
  const originalFetch = global.fetch;

  const email = uniqueEmail();
  const password = 'StripeCheckout123!';

  process.env.BILLING_PROVIDER = 'stripe';
  process.env.BILLING_STRIPE_SECRET_KEY = 'sk_test_123';
  process.env.BILLING_STRIPE_PRICE_ID_PRO = 'price_pro_123';
  process.env.BILLING_STRIPE_SUCCESS_URL = 'https://example.com/success';
  process.env.BILLING_STRIPE_CANCEL_URL = 'https://example.com/cancel';

  let fetchCall = null;
  global.fetch = async (url, init = {}) => {
    fetchCall = { url, init };
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/pay/cs_test_123',
        };
      },
    };
  };

  try {
    const registerReq = buildReq('POST', {
      action: 'register',
      name: 'Stripe Checkout User',
      email,
      password,
    });
    const registerRes = createRes();
    await authHandler(registerReq, registerRes);
    assert.equal(registerRes.statusCode, 201);

    const userId = registerRes.body.user.id;
    const authHeaders = getAuthHeadersFromResponse(registerRes);
    const checkoutReq = buildReq(
      'POST',
      { action: 'start_checkout', planId: 'pro' },
      { headers: authHeaders },
    );
    const checkoutRes = createRes();
    await billingHandler(checkoutReq, checkoutRes);

    assert.equal(checkoutRes.statusCode, 200);
    assert.equal(checkoutRes.body.provider, 'stripe');
    assert.equal(checkoutRes.body.checkoutUrl, 'https://checkout.stripe.com/pay/cs_test_123');
    assert.equal(typeof fetchCall?.url, 'string');
    assert.equal(fetchCall.url.includes('/checkout/sessions'), true);
    assert.equal(String(fetchCall.init?.method || '').toUpperCase(), 'POST');
    assert.equal(String(fetchCall.init?.headers?.Authorization || '').startsWith('Bearer sk_test_123'), true);

    const encodedBody = String(fetchCall.init?.body || '');
    assert.equal(encodedBody.includes('line_items%5B0%5D%5Bprice%5D=price_pro_123'), true);
    assert.equal(encodedBody.includes(`client_reference_id=${encodeURIComponent(userId)}`), true);
    assert.equal(encodedBody.includes('metadata%5BplanId%5D=pro'), true);
  } finally {
    process.env.BILLING_PROVIDER = originalEnv.BILLING_PROVIDER;
    process.env.BILLING_STRIPE_SECRET_KEY = originalEnv.BILLING_STRIPE_SECRET_KEY;
    process.env.BILLING_STRIPE_PRICE_ID_PRO = originalEnv.BILLING_STRIPE_PRICE_ID_PRO;
    process.env.BILLING_STRIPE_SUCCESS_URL = originalEnv.BILLING_STRIPE_SUCCESS_URL;
    process.env.BILLING_STRIPE_CANCEL_URL = originalEnv.BILLING_STRIPE_CANCEL_URL;
    global.fetch = originalFetch;
  }
});

test('billing endpoint returns checkout_unavailable when stripe config is missing', async () => {
  const originalEnv = {
    BILLING_PROVIDER: process.env.BILLING_PROVIDER,
    BILLING_STRIPE_SECRET_KEY: process.env.BILLING_STRIPE_SECRET_KEY,
    BILLING_STRIPE_PRICE_ID_PRO: process.env.BILLING_STRIPE_PRICE_ID_PRO,
    BILLING_STRIPE_SUCCESS_URL: process.env.BILLING_STRIPE_SUCCESS_URL,
    BILLING_STRIPE_CANCEL_URL: process.env.BILLING_STRIPE_CANCEL_URL,
  };

  const email = uniqueEmail();
  const password = 'StripeMissingConfig123!';

  process.env.BILLING_PROVIDER = 'stripe';
  process.env.BILLING_STRIPE_SECRET_KEY = '';
  process.env.BILLING_STRIPE_PRICE_ID_PRO = 'price_pro_123';
  process.env.BILLING_STRIPE_SUCCESS_URL = 'https://example.com/success';
  process.env.BILLING_STRIPE_CANCEL_URL = 'https://example.com/cancel';

  try {
    const registerReq = buildReq('POST', {
      action: 'register',
      name: 'Stripe Missing Config User',
      email,
      password,
    });
    const registerRes = createRes();
    await authHandler(registerReq, registerRes);
    assert.equal(registerRes.statusCode, 201);

    const authHeaders = getAuthHeadersFromResponse(registerRes);
    const checkoutReq = buildReq(
      'POST',
      { action: 'start_checkout', planId: 'pro' },
      { headers: authHeaders },
    );
    const checkoutRes = createRes();
    await billingHandler(checkoutReq, checkoutRes);

    assert.equal(checkoutRes.statusCode, 503);
    assert.equal(checkoutRes.body.code, 'checkout_unavailable');
  } finally {
    process.env.BILLING_PROVIDER = originalEnv.BILLING_PROVIDER;
    process.env.BILLING_STRIPE_SECRET_KEY = originalEnv.BILLING_STRIPE_SECRET_KEY;
    process.env.BILLING_STRIPE_PRICE_ID_PRO = originalEnv.BILLING_STRIPE_PRICE_ID_PRO;
    process.env.BILLING_STRIPE_SUCCESS_URL = originalEnv.BILLING_STRIPE_SUCCESS_URL;
    process.env.BILLING_STRIPE_CANCEL_URL = originalEnv.BILLING_STRIPE_CANCEL_URL;
  }
});

test('billing endpoint can create paddle checkout transaction when configured', async () => {
  const originalEnv = {
    BILLING_PROVIDER: process.env.BILLING_PROVIDER,
    BILLING_PADDLE_API_KEY: process.env.BILLING_PADDLE_API_KEY,
    BILLING_PADDLE_PRICE_ID_PRO: process.env.BILLING_PADDLE_PRICE_ID_PRO,
    BILLING_PADDLE_CHECKOUT_URL: process.env.BILLING_PADDLE_CHECKOUT_URL,
  };
  const originalFetch = global.fetch;

  const email = uniqueEmail();
  const password = 'PaddleCheckout123!';

  process.env.BILLING_PROVIDER = 'paddle';
  process.env.BILLING_PADDLE_API_KEY = 'pdl_live_apikey_test_123';
  process.env.BILLING_PADDLE_PRICE_ID_PRO = 'pri_pro_123';
  process.env.BILLING_PADDLE_CHECKOUT_URL = 'https://koku-dedektifi.vercel.app';

  let fetchCall = null;
  global.fetch = async (url, init = {}) => {
    fetchCall = { url, init };
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          data: {
            id: 'txn_test_123',
            checkout: {
              url: 'https://koku-dedektifi.vercel.app/?_ptxn=txn_test_123',
            },
          },
        };
      },
    };
  };

  try {
    const registerReq = buildReq('POST', {
      action: 'register',
      name: 'Paddle Checkout User',
      email,
      password,
    });
    const registerRes = createRes();
    await authHandler(registerReq, registerRes);
    assert.equal(registerRes.statusCode, 201);

    const userId = registerRes.body.user.id;
    const authHeaders = getAuthHeadersFromResponse(registerRes);
    const checkoutReq = buildReq(
      'POST',
      { action: 'start_checkout', planId: 'pro' },
      { headers: authHeaders },
    );
    const checkoutRes = createRes();
    await billingHandler(checkoutReq, checkoutRes);

    assert.equal(checkoutRes.statusCode, 200);
    assert.equal(checkoutRes.body.provider, 'paddle');
    assert.equal(checkoutRes.body.checkoutUrl, 'https://koku-dedektifi.vercel.app/?_ptxn=txn_test_123');
    assert.equal(typeof fetchCall?.url, 'string');
    assert.equal(fetchCall.url.includes('/transactions'), true);
    assert.equal(String(fetchCall.init?.method || '').toUpperCase(), 'POST');
    assert.equal(String(fetchCall.init?.headers?.Authorization || '').startsWith('Bearer pdl_live_apikey_test_123'), true);

    const jsonBody = JSON.parse(String(fetchCall.init?.body || '{}'));
    assert.equal(jsonBody.collection_mode, 'automatic');
    assert.equal(jsonBody.items?.[0]?.price_id, 'pri_pro_123');
    assert.equal(jsonBody.items?.[0]?.quantity, 1);
    assert.equal(jsonBody.custom_data?.userId, userId);
    assert.equal(jsonBody.custom_data?.planId, 'pro');
    assert.equal(jsonBody.checkout?.url, 'https://koku-dedektifi.vercel.app');
  } finally {
    process.env.BILLING_PROVIDER = originalEnv.BILLING_PROVIDER;
    process.env.BILLING_PADDLE_API_KEY = originalEnv.BILLING_PADDLE_API_KEY;
    process.env.BILLING_PADDLE_PRICE_ID_PRO = originalEnv.BILLING_PADDLE_PRICE_ID_PRO;
    process.env.BILLING_PADDLE_CHECKOUT_URL = originalEnv.BILLING_PADDLE_CHECKOUT_URL;
    global.fetch = originalFetch;
  }
});

test('billing endpoint returns checkout_unavailable when paddle config is missing', async () => {
  const originalEnv = {
    BILLING_PROVIDER: process.env.BILLING_PROVIDER,
    BILLING_PADDLE_API_KEY: process.env.BILLING_PADDLE_API_KEY,
    BILLING_PADDLE_PRICE_ID_PRO: process.env.BILLING_PADDLE_PRICE_ID_PRO,
  };

  const email = uniqueEmail();
  const password = 'PaddleMissingConfig123!';

  process.env.BILLING_PROVIDER = 'paddle';
  process.env.BILLING_PADDLE_API_KEY = '';
  process.env.BILLING_PADDLE_PRICE_ID_PRO = 'pri_pro_123';

  try {
    const registerReq = buildReq('POST', {
      action: 'register',
      name: 'Paddle Missing Config User',
      email,
      password,
    });
    const registerRes = createRes();
    await authHandler(registerReq, registerRes);
    assert.equal(registerRes.statusCode, 201);

    const authHeaders = getAuthHeadersFromResponse(registerRes);
    const checkoutReq = buildReq(
      'POST',
      { action: 'start_checkout', planId: 'pro' },
      { headers: authHeaders },
    );
    const checkoutRes = createRes();
    await billingHandler(checkoutReq, checkoutRes);

    assert.equal(checkoutRes.statusCode, 503);
    assert.equal(checkoutRes.body.code, 'checkout_unavailable');
  } finally {
    process.env.BILLING_PROVIDER = originalEnv.BILLING_PROVIDER;
    process.env.BILLING_PADDLE_API_KEY = originalEnv.BILLING_PADDLE_API_KEY;
    process.env.BILLING_PADDLE_PRICE_ID_PRO = originalEnv.BILLING_PADDLE_PRICE_ID_PRO;
  }
});

test('billing webhook validates signature, is idempotent, and syncs entitlement', async () => {
  const email = uniqueEmail();
  const password = 'WebhookPass123!';

  const registerReq = buildReq('POST', {
    action: 'register',
    name: 'Webhook User',
    email,
    password,
  });
  const registerRes = createRes();
  await authHandler(registerReq, registerRes);
  assert.equal(registerRes.statusCode, 201);

  const userId = registerRes.body.user.id;
  const authHeaders = getAuthHeadersFromResponse(registerRes);

  const activatePayload = {
    id: `evt_${Date.now().toString(36)}_activate`,
    type: 'subscription.activated',
    provider: 'test-provider',
    data: {
      userId,
      planId: 'pro',
    },
  };
  const activateRaw = JSON.stringify(activatePayload);

  const webhookReq = buildReq('POST', activateRaw, {
    headers: {
      'x-billing-signature': signBillingPayload(activateRaw),
    },
  });
  const webhookRes = createRes();
  await billingWebhookHandler(webhookReq, webhookRes);

  assert.equal(webhookRes.statusCode, 200);
  assert.equal(webhookRes.body.ok, true);
  assert.equal(webhookRes.body.entitlement.tier, 'pro');
  assert.equal(webhookRes.body.entitlement.status, 'active');

  const authGetAfterActivateReq = buildReq('GET', null, { headers: authHeaders });
  const authGetAfterActivateRes = createRes();
  await billingHandler(authGetAfterActivateReq, authGetAfterActivateRes);
  assert.equal(authGetAfterActivateRes.statusCode, 200);
  assert.equal(authGetAfterActivateRes.body.entitlement.tier, 'pro');
  assert.equal(authGetAfterActivateRes.body.entitlement.status, 'active');

  const duplicateReq = buildReq('POST', activateRaw, {
    headers: {
      'x-billing-signature': signBillingPayload(activateRaw),
    },
  });
  const duplicateRes = createRes();
  await billingWebhookHandler(duplicateReq, duplicateRes);
  assert.equal(duplicateRes.statusCode, 200);
  assert.equal(duplicateRes.body.duplicate, true);

  const invalidSigReq = buildReq('POST', activateRaw, {
    headers: {
      'x-billing-signature': 'sha256=0000000000000000000000000000000000000000000000000000000000000000',
    },
  });
  const invalidSigRes = createRes();
  await billingWebhookHandler(invalidSigReq, invalidSigRes);
  assert.equal(invalidSigRes.statusCode, 401);

  const cancelPayload = {
    id: `evt_${Date.now().toString(36)}_cancel`,
    type: 'subscription.canceled',
    provider: 'test-provider',
    data: {
      userId,
      planId: 'pro',
    },
  };
  const cancelRaw = JSON.stringify(cancelPayload);
  const cancelReq = buildReq('POST', cancelRaw, {
    headers: {
      'x-billing-signature': signBillingPayload(cancelRaw),
    },
  });
  const cancelRes = createRes();
  await billingWebhookHandler(cancelReq, cancelRes);
  assert.equal(cancelRes.statusCode, 200);
  assert.equal(cancelRes.body.entitlement.status, 'canceled');
  assert.equal(cancelRes.body.entitlement.cancelAtPeriodEnd, true);

  const authGetAfterCancelReq = buildReq('GET', null, { headers: authHeaders });
  const authGetAfterCancelRes = createRes();
  await billingHandler(authGetAfterCancelReq, authGetAfterCancelRes);
  assert.equal(authGetAfterCancelRes.statusCode, 200);
  assert.equal(authGetAfterCancelRes.body.entitlement.tier, 'pro');
  assert.equal(authGetAfterCancelRes.body.entitlement.status, 'canceled');
});

test('billing webhook supports stripe-signature format and event mapping', async () => {
  const email = uniqueEmail();
  const password = 'StripeWebhook123!';

  const registerReq = buildReq('POST', {
    action: 'register',
    name: 'Stripe Webhook User',
    email,
    password,
  });
  const registerRes = createRes();
  await authHandler(registerReq, registerRes);
  assert.equal(registerRes.statusCode, 201);

  const userId = registerRes.body.user.id;
  const authHeaders = getAuthHeadersFromResponse(registerRes);

  const stripeActivatePayload = {
    id: `evt_${Date.now().toString(36)}_stripe_activate`,
    type: 'checkout.session.completed',
    data: {
      object: {
        client_reference_id: userId,
        metadata: {
          planId: 'pro',
        },
      },
    },
  };
  const stripeActivateRaw = JSON.stringify(stripeActivatePayload);
  const stripeActivateReq = buildReq('POST', stripeActivateRaw, {
    headers: {
      'stripe-signature': signStripePayload(stripeActivateRaw),
    },
  });
  const stripeActivateRes = createRes();
  await billingWebhookHandler(stripeActivateReq, stripeActivateRes);
  assert.equal(stripeActivateRes.statusCode, 200);
  assert.equal(stripeActivateRes.body.entitlement.tier, 'pro');
  assert.equal(stripeActivateRes.body.entitlement.status, 'active');

  const stripeCancelPayload = {
    id: `evt_${Date.now().toString(36)}_stripe_cancel`,
    type: 'customer.subscription.deleted',
    data: {
      object: {
        metadata: {
          userId,
        },
        items: {
          data: [
            {
              price: {
                lookup_key: 'pro_monthly',
              },
            },
          ],
        },
      },
    },
  };
  const stripeCancelRaw = JSON.stringify(stripeCancelPayload);
  const stripeCancelReq = buildReq('POST', stripeCancelRaw, {
    headers: {
      'stripe-signature': signStripePayload(stripeCancelRaw),
    },
  });
  const stripeCancelRes = createRes();
  await billingWebhookHandler(stripeCancelReq, stripeCancelRes);
  assert.equal(stripeCancelRes.statusCode, 200);
  assert.equal(stripeCancelRes.body.entitlement.tier, 'pro');
  assert.equal(stripeCancelRes.body.entitlement.status, 'canceled');

  const afterCancelReq = buildReq('GET', null, { headers: authHeaders });
  const afterCancelRes = createRes();
  await billingHandler(afterCancelReq, afterCancelRes);
  assert.equal(afterCancelRes.statusCode, 200);
  assert.equal(afterCancelRes.body.entitlement.tier, 'pro');
  assert.equal(afterCancelRes.body.entitlement.status, 'canceled');

  const stalePayload = {
    id: `evt_${Date.now().toString(36)}_stripe_stale`,
    type: 'checkout.session.completed',
    data: {
      object: {
        client_reference_id: userId,
        metadata: { planId: 'pro' },
      },
    },
  };
  const staleRaw = JSON.stringify(stalePayload);
  const staleTimestamp = Math.floor(Date.now() / 1000) - 4000;
  const staleReq = buildReq('POST', staleRaw, {
    headers: {
      'stripe-signature': signStripePayload(staleRaw, staleTimestamp),
    },
  });
  const staleRes = createRes();
  await billingWebhookHandler(staleReq, staleRes);
  assert.equal(staleRes.statusCode, 401);
});

test('billing webhook supports paddle-signature format and paddle event fields', async () => {
  const email = uniqueEmail();
  const password = 'PaddleWebhook123!';

  const registerReq = buildReq('POST', {
    action: 'register',
    name: 'Paddle Webhook User',
    email,
    password,
  });
  const registerRes = createRes();
  await authHandler(registerReq, registerRes);
  assert.equal(registerRes.statusCode, 201);

  const userId = registerRes.body.user.id;
  const authHeaders = getAuthHeadersFromResponse(registerRes);

  const activatePayload = {
    event_id: `evt_${Date.now().toString(36)}_paddle_activate`,
    event_type: 'subscription.created',
    data: {
      status: 'active',
      custom_data: {
        userId,
        planId: 'pro',
      },
    },
  };
  const activateRaw = JSON.stringify(activatePayload);
  const activateReq = buildReq('POST', activateRaw, {
    headers: {
      'paddle-signature': signPaddlePayload(activateRaw),
    },
  });
  const activateRes = createRes();
  await billingWebhookHandler(activateReq, activateRes);
  assert.equal(activateRes.statusCode, 200);
  assert.equal(activateRes.body.entitlement.tier, 'pro');
  assert.equal(activateRes.body.entitlement.status, 'active');

  const pastDuePayload = {
    event_id: `evt_${Date.now().toString(36)}_paddle_past_due`,
    event_type: 'subscription.past_due',
    data: {
      custom_data: {
        user_id: userId,
        plan_id: 'pro',
      },
    },
  };
  const pastDueRaw = JSON.stringify(pastDuePayload);
  const pastDueReq = buildReq('POST', pastDueRaw, {
    headers: {
      'paddle-signature': signPaddlePayload(pastDueRaw),
    },
  });
  const pastDueRes = createRes();
  await billingWebhookHandler(pastDueReq, pastDueRes);
  assert.equal(pastDueRes.statusCode, 200);
  assert.equal(pastDueRes.body.entitlement.status, 'past_due');

  const afterPastDueReq = buildReq('GET', null, { headers: authHeaders });
  const afterPastDueRes = createRes();
  await billingHandler(afterPastDueReq, afterPastDueRes);
  assert.equal(afterPastDueRes.statusCode, 200);
  assert.equal(afterPastDueRes.body.entitlement.tier, 'pro');
  assert.equal(afterPastDueRes.body.entitlement.status, 'past_due');

  const stalePayload = {
    event_id: `evt_${Date.now().toString(36)}_paddle_stale`,
    event_type: 'subscription.created',
    data: {
      custom_data: {
        userId,
        planId: 'pro',
      },
    },
  };
  const staleRaw = JSON.stringify(stalePayload);
  const staleTimestamp = Math.floor(Date.now() / 1000) - 4000;
  const staleReq = buildReq('POST', staleRaw, {
    headers: {
      'paddle-signature': signPaddlePayload(staleRaw, staleTimestamp),
    },
  });
  const staleRes = createRes();
  await billingWebhookHandler(staleReq, staleRes);
  assert.equal(staleRes.statusCode, 401);
});
