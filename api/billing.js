const crypto = require('crypto');
const { createRuntimeStore } = require('../lib/server/runtime-store');
const { fetchSupabaseUserById, hasSupabaseAuthUsersConfig } = require('../lib/server/supabase-auth-users');

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

const MAX_BODY_BYTES = 20 * 1024;
const BILLING_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const BILLING_RATE_LIMIT_MAX = 30;
const BILLING_TTL_MS = 400 * 24 * 60 * 60 * 1000;
const PLAN_ID_RE = /^[a-z0-9_-]{2,24}$/i;

const userStore = createRuntimeStore({
  cacheTtlMs: 365 * 24 * 60 * 60 * 1000,
  cacheMaxEntries: 30000,
  keyPrefix: 'koku-auth-user',
});

const sessionStore = createRuntimeStore({
  cacheTtlMs: 30 * 24 * 60 * 60 * 1000,
  cacheMaxEntries: 50000,
  keyPrefix: 'koku-auth-session',
});

const billingStore = createRuntimeStore({
  rateLimitWindowMs: BILLING_RATE_LIMIT_WINDOW_MS,
  rateLimitMax: BILLING_RATE_LIMIT_MAX,
  cacheTtlMs: BILLING_TTL_MS,
  cacheMaxEntries: 20000,
  keyPrefix: 'koku-billing',
});

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanNumber(value, fallback) {
  const parsed = Number.parseFloat(cleanString(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    return true;
  }

  if (!getAllowedOrigins(req).has(origin)) return false;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  return true;
}

function hashSha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function sessionKey(token) {
  return `session:${hashSha256(token)}`;
}

function userKey(userId) {
  return `user:${userId}`;
}

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body && typeof body === 'object' ? body : null;
}

function getAuthToken(req) {
  const authHeader = cleanString(req.headers.authorization);
  if (!authHeader.startsWith('Bearer ')) return '';
  return cleanString(authHeader.slice(7));
}

async function readAuthSession(req) {
  const token = getAuthToken(req);
  if (!token) return null;

  const session = await sessionStore.getCache(sessionKey(token));
  if (!session || session.active !== true || !session.userId) return null;

  let user = await userStore.getCache(userKey(session.userId));
  if (!user && hasSupabaseAuthUsersConfig()) {
    try {
      user = await fetchSupabaseUserById(session.userId);
      if (user?.id) {
        await userStore.setCache(userKey(user.id), user);
      }
    } catch (error) {
      console.warn('[billing] Supabase auth user lookup failed.', error?.message || error);
    }
  }
  if (!user) return null;

  return { token, session, user };
}

function getPlanCatalog() {
  const currency = cleanString(process.env.BILLING_CURRENCY) || 'TRY';
  const interval = cleanString(process.env.BILLING_INTERVAL) || 'month';

  return [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      currency,
      interval,
      featured: false,
      features: [
        'Gunluk temel analiz',
        'Standart koku danismani',
        'Yerel gecmis kaydi',
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: cleanNumber(process.env.BILLING_PRICE_PRO, 199),
      currency,
      interval,
      featured: true,
      features: [
        'Oncelikli cevap hizi',
        'Gelişmis kişiselleştirme',
        'Derin analiz + ops gorunurlugu',
      ],
    },
  ];
}

function normalizeEntitlement(entry) {
  const src = entry && typeof entry === 'object' ? entry : {};
  const tier = cleanString(src.tier).toLowerCase();
  const status = cleanString(src.status).toLowerCase();
  return {
    tier: tier || 'free',
    status: status || 'active',
    source: cleanString(src.source) || 'default',
    updatedAt: cleanString(src.updatedAt) || null,
    checkoutPlanId: cleanString(src.checkoutPlanId) || '',
    checkoutStartedAt: cleanString(src.checkoutStartedAt) || null,
    cancelAtPeriodEnd: src.cancelAtPeriodEnd === true,
  };
}

function entitlementKey(userId) {
  return `entitlement:user:${userId}`;
}

function checkoutKey(userId) {
  return `checkout:user:${userId}`;
}

function isDevActivationAllowed() {
  if (cleanString(process.env.BILLING_ALLOW_DEV_ACTIVATION).toLowerCase() === 'true') {
    return true;
  }
  const nodeEnv = cleanString(process.env.NODE_ENV).toLowerCase();
  const vercelEnv = cleanString(process.env.VERCEL_ENV).toLowerCase();
  if (nodeEnv && nodeEnv !== 'production') return true;
  if (vercelEnv && vercelEnv !== 'production') return true;
  return false;
}

function getCheckoutUrl(planId) {
  const upper = String(planId || '').toUpperCase();
  const direct = cleanString(process.env[`BILLING_CHECKOUT_URL_${upper}`]);
  if (direct) return direct;

  if (planId === 'pro') return cleanString(process.env.BILLING_CHECKOUT_URL_PRO);
  return '';
}

function getBillingProvider() {
  return cleanString(process.env.BILLING_PROVIDER).toLowerCase() || 'manual';
}

function getStripePriceId(planId) {
  const upper = String(planId || '').toUpperCase();
  const direct = cleanString(process.env[`BILLING_STRIPE_PRICE_ID_${upper}`]);
  if (direct) return direct;
  if (planId === 'pro') return cleanString(process.env.BILLING_STRIPE_PRICE_ID_PRO);
  return '';
}

function getPaddlePriceId(planId) {
  const upper = String(planId || '').toUpperCase();
  const direct = cleanString(process.env[`BILLING_PADDLE_PRICE_ID_${upper}`]);
  if (direct) return direct;
  if (planId === 'pro') return cleanString(process.env.BILLING_PADDLE_PRICE_ID_PRO);
  return '';
}

function getPaddleApiKey() {
  return cleanString(process.env.BILLING_PADDLE_API_KEY);
}

function getPaddleApiBase() {
  return cleanString(process.env.BILLING_PADDLE_API_BASE) || 'https://api.paddle.com';
}

function getPaddleCheckoutUrl() {
  return cleanString(process.env.BILLING_PADDLE_CHECKOUT_URL);
}

function parseProviderError(payload, fallback = '') {
  const direct = cleanString(payload?.error?.detail || payload?.error?.message);
  if (direct) return direct;
  const firstListDetail = cleanString(payload?.errors?.[0]?.detail || payload?.errors?.[0]?.message);
  if (firstListDetail) return firstListDetail;
  return fallback;
}

function getStripeApiBase() {
  return cleanString(process.env.BILLING_STRIPE_API_BASE) || 'https://api.stripe.com/v1';
}

function getStripeSuccessUrl() {
  return cleanString(process.env.BILLING_STRIPE_SUCCESS_URL) || cleanString(process.env.BILLING_CHECKOUT_SUCCESS_URL);
}

function getStripeCancelUrl() {
  return cleanString(process.env.BILLING_STRIPE_CANCEL_URL) || cleanString(process.env.BILLING_CHECKOUT_CANCEL_URL);
}

function buildManualCheckoutUrl(checkoutUrl, userId, planId) {
  const connector = checkoutUrl.includes('?') ? '&' : '?';
  return `${checkoutUrl}${connector}uid=${encodeURIComponent(userId)}&pid=${encodeURIComponent(planId)}`;
}

async function createStripeCheckout(auth, plan) {
  const secret = cleanString(process.env.BILLING_STRIPE_SECRET_KEY);
  if (!secret) {
    return { ok: false, code: 'checkout_unavailable', error: 'Stripe secret tanimli degil.', status: 503 };
  }

  const priceId = getStripePriceId(plan.id);
  if (!priceId) {
    return { ok: false, code: 'checkout_unavailable', error: 'Stripe price id tanimli degil.', status: 503 };
  }

  const successUrl = getStripeSuccessUrl();
  const cancelUrl = getStripeCancelUrl();
  if (!successUrl || !cancelUrl) {
    return {
      ok: false,
      code: 'checkout_unavailable',
      error: 'Stripe success/cancel URL tanimli degil.',
      status: 503,
    };
  }

  const body = new URLSearchParams();
  body.set('mode', 'subscription');
  body.set('success_url', successUrl);
  body.set('cancel_url', cancelUrl);
  body.set('client_reference_id', auth.user.id);
  body.set('metadata[userId]', auth.user.id);
  body.set('metadata[planId]', plan.id);
  body.set('line_items[0][price]', priceId);
  body.set('line_items[0][quantity]', '1');
  body.set('allow_promotion_codes', 'true');

  const apiBase = getStripeApiBase().replace(/\/+$/, '');
  try {
    const response = await fetch(`${apiBase}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch {}

    if (!response.ok) {
      const detail = cleanString(payload?.error?.message) || `Stripe checkout baslatilamadi (${response.status})`;
      return { ok: false, code: 'checkout_unavailable', error: detail, status: 503 };
    }

    const url = cleanString(payload?.url);
    if (!url) {
      return { ok: false, code: 'checkout_unavailable', error: 'Stripe checkout URL bos dondu.', status: 503 };
    }

    return {
      ok: true,
      checkoutUrl: url,
      externalCheckoutId: cleanString(payload?.id),
      provider: 'stripe',
    };
  } catch {
    return { ok: false, code: 'checkout_unavailable', error: 'Stripe servisine baglanilamadi.', status: 503 };
  }
}

async function createPaddleCheckout(auth, plan) {
  const apiKey = getPaddleApiKey();
  if (!apiKey) {
    return { ok: false, code: 'checkout_unavailable', error: 'Paddle API key tanimli degil.', status: 503 };
  }

  const priceId = getPaddlePriceId(plan.id);
  if (!priceId) {
    return { ok: false, code: 'checkout_unavailable', error: 'Paddle price id tanimli degil.', status: 503 };
  }

  const body = {
    collection_mode: 'automatic',
    items: [
      {
        price_id: priceId,
        quantity: 1,
      },
    ],
    custom_data: {
      userId: auth.user.id,
      planId: plan.id,
    },
  };

  const checkoutUrl = getPaddleCheckoutUrl();
  if (checkoutUrl) {
    body.checkout = { url: checkoutUrl };
  }

  const apiBase = getPaddleApiBase().replace(/\/+$/, '');
  try {
    const response = await fetch(`${apiBase}/transactions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch {}

    if (!response.ok) {
      const detail = parseProviderError(payload, `Paddle checkout baslatilamadi (${response.status})`);
      return { ok: false, code: 'checkout_unavailable', error: detail, status: 503 };
    }

    const url = cleanString(payload?.data?.checkout?.url);
    if (!url) {
      return { ok: false, code: 'checkout_unavailable', error: 'Paddle checkout URL bos dondu.', status: 503 };
    }

    return {
      ok: true,
      checkoutUrl: url,
      externalCheckoutId: cleanString(payload?.data?.id),
      provider: 'paddle',
    };
  } catch {
    return { ok: false, code: 'checkout_unavailable', error: 'Paddle servisine baglanilamadi.', status: 503 };
  }
}

async function resolveCheckout(auth, plan) {
  const provider = getBillingProvider();

  if (provider === 'stripe') {
    return createStripeCheckout(auth, plan);
  }
  if (provider === 'paddle') {
    return createPaddleCheckout(auth, plan);
  }

  const checkoutUrl = getCheckoutUrl(plan.id);
  if (!checkoutUrl) {
    return {
      ok: false,
      code: 'checkout_unavailable',
      error: 'Checkout URL tanimli degil.',
      status: 503,
    };
  }

  return {
    ok: true,
    checkoutUrl: buildManualCheckoutUrl(checkoutUrl, auth.user.id, plan.id),
    externalCheckoutId: '',
    provider: provider || 'manual',
  };
}

function getPlanById(planId) {
  const id = cleanString(planId).toLowerCase();
  if (!PLAN_ID_RE.test(id)) return null;
  return getPlanCatalog().find((plan) => plan.id === id) || null;
}

async function readEntitlementForUser(userId) {
  const row = await billingStore.getCache(entitlementKey(userId));
  return normalizeEntitlement(row);
}

async function writeEntitlementForUser(userId, entitlement) {
  const next = normalizeEntitlement({
    ...entitlement,
    updatedAt: new Date().toISOString(),
  });
  await billingStore.setCache(entitlementKey(userId), next);
  return next;
}

function sanitizeUser(user) {
  if (!user || typeof user !== 'object') return null;
  return {
    id: cleanString(user.id),
    email: cleanString(user.email),
    name: cleanString(user.name),
  };
}

async function handleStartCheckout(req, res, auth, body) {
  if (!auth) return res.status(401).json({ error: 'Checkout icin giris gerekli.' });

  const planId = cleanString(body.planId).toLowerCase();
  const plan = getPlanById(planId);
  if (!plan || plan.id === 'free') {
    return res.status(400).json({ error: 'Gecersiz plan secimi.' });
  }

  const checkoutResult = await resolveCheckout(auth, plan);
  if (!checkoutResult.ok) {
    return res.status(checkoutResult.status || 503).json({
      error: checkoutResult.error || 'Checkout baslatilamadi.',
      code: checkoutResult.code || 'checkout_unavailable',
    });
  }

  const checkoutId = `chk_${crypto.randomBytes(8).toString('hex')}`;
  const startedAt = new Date().toISOString();
  await billingStore.setCache(checkoutKey(auth.user.id), {
    checkoutId,
    planId: plan.id,
    userId: auth.user.id,
    startedAt,
    provider: checkoutResult.provider || getBillingProvider(),
    externalCheckoutId: checkoutResult.externalCheckoutId || '',
  });

  return res.status(200).json({
    checkoutId,
    checkoutUrl: checkoutResult.checkoutUrl,
    planId: plan.id,
    provider: checkoutResult.provider || getBillingProvider(),
  });
}

async function handleActivateDev(req, res, auth, body) {
  if (!auth) return res.status(401).json({ error: 'Dev aktivasyon icin giris gerekli.' });
  if (!isDevActivationAllowed()) {
    return res.status(403).json({ error: 'Dev aktivasyon production ortamda kapali.' });
  }

  const planId = cleanString(body.planId).toLowerCase();
  const plan = getPlanById(planId);
  if (!plan) return res.status(400).json({ error: 'Gecersiz plan secimi.' });

  const entitlement = await writeEntitlementForUser(auth.user.id, {
    tier: plan.id,
    status: 'active',
    source: 'dev',
    cancelAtPeriodEnd: false,
  });

  return res.status(200).json({
    ok: true,
    entitlement,
  });
}

async function handleCancel(req, res, auth) {
  if (!auth) return res.status(401).json({ error: 'Iptal icin giris gerekli.' });
  const current = await readEntitlementForUser(auth.user.id);
  const next = await writeEntitlementForUser(auth.user.id, {
    ...current,
    status: 'canceled',
    cancelAtPeriodEnd: true,
    source: current.source || 'manual',
  });
  return res.status(200).json({ ok: true, entitlement: next });
}

async function handler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res)) {
    return res.status(403).json({ error: 'Bu origin icin erisim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIP(req);
  const rate = await billingStore.checkRateLimit(`billing:${ip}`);
  if (!rate.allowed) {
    const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'Cok fazla billing istegi', retryAfter });
  }

  const auth = await readAuthSession(req);
  const plans = getPlanCatalog();

  if (req.method === 'GET') {
    const entitlement = auth ? await readEntitlementForUser(auth.user.id) : normalizeEntitlement(null);
    return res.status(200).json({
      provider: getBillingProvider(),
      plans,
      entitlement,
      user: sanitizeUser(auth?.user || null),
      devActivationAllowed: isDevActivationAllowed(),
    });
  }

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Gecersiz JSON govdesi' });
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'Istek cok buyuk' });
  }

  const action = cleanString(body.action).toLowerCase();
  if (!action) return res.status(400).json({ error: 'action gerekli' });

  if (action === 'start_checkout') {
    return handleStartCheckout(req, res, auth, body);
  }
  if (action === 'activate_dev_plan') {
    return handleActivateDev(req, res, auth, body);
  }
  if (action === 'cancel_subscription') {
    return handleCancel(req, res, auth);
  }

  return res.status(400).json({ error: 'Bilinmeyen action' });
}

handler.config = {
  api: {
    bodyParser: {
      sizeLimit: '24kb',
    },
  },
};

module.exports = handler;
