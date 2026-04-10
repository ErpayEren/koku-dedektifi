const crypto = require('crypto');
const { MAX_BODY_BYTES, cleanString, setCorsHeaders, setSecurityHeaders } = require('../lib/server/config');
const { readAuthSession, hydrateRuntimeUserCache } = require('../lib/server/auth-session');
const {
  billingStore,
  checkoutKey,
  getBillingProvider,
  getPlanCatalog,
  getPlanById,
  isDevActivationAllowed,
  normalizeEntitlement,
  readEntitlementForUser,
  writeEntitlementForUser,
} = require('../lib/server/billing-store');
const { hasSupabaseAuthUsersConfig, updateSupabaseUser } = require('../lib/server/supabase-auth-users');

const BILLING_MAX_BODY_BYTES = Math.min(MAX_BODY_BYTES, 20 * 1024);

function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
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

function getCheckoutUrl(planId) {
  const upper = String(planId || '').toUpperCase();
  const direct = cleanString(process.env[`BILLING_CHECKOUT_URL_${upper}`]);
  if (direct) return direct;
  if (planId === 'pro') return cleanString(process.env.BILLING_CHECKOUT_URL_PRO);
  return '';
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

function parseProviderError(payload, fallback = '') {
  const direct = cleanString(payload?.error?.detail || payload?.error?.message);
  if (direct) return direct;
  const firstListDetail = cleanString(payload?.errors?.[0]?.detail || payload?.errors?.[0]?.message);
  if (firstListDetail) return firstListDetail;
  return fallback;
}

async function createStripeCheckout(auth, plan) {
  const secret = cleanString(process.env.BILLING_STRIPE_SECRET_KEY);
  if (!secret) {
    return { ok: false, code: 'checkout_unavailable', error: 'Stripe secret tanımlı değil.', status: 503 };
  }

  const priceId = getStripePriceId(plan.id);
  if (!priceId) {
    return { ok: false, code: 'checkout_unavailable', error: 'Stripe price id tanımlı değil.', status: 503 };
  }

  const successUrl = getStripeSuccessUrl();
  const cancelUrl = getStripeCancelUrl();
  if (!successUrl || !cancelUrl) {
    return {
      ok: false,
      code: 'checkout_unavailable',
      error: 'Stripe success/cancel URL tanımlı değil.',
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

  try {
    const response = await fetch(`${getStripeApiBase().replace(/\/+$/, '')}/checkout/sessions`, {
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
      const detail = cleanString(payload?.error?.message) || `Stripe checkout başlatılamadı (${response.status})`;
      return { ok: false, code: 'checkout_unavailable', error: detail, status: 503 };
    }

    const url = cleanString(payload?.url);
    if (!url) {
      return { ok: false, code: 'checkout_unavailable', error: 'Stripe checkout URL boş döndü.', status: 503 };
    }

    return {
      ok: true,
      checkoutUrl: url,
      externalCheckoutId: cleanString(payload?.id),
      provider: 'stripe',
    };
  } catch {
    return { ok: false, code: 'checkout_unavailable', error: 'Stripe servisine bağlanılamadı.', status: 503 };
  }
}

async function createPaddleCheckout(auth, plan) {
  const apiKey = getPaddleApiKey();
  if (!apiKey) {
    return { ok: false, code: 'checkout_unavailable', error: 'Paddle API key tanımlı değil.', status: 503 };
  }

  const priceId = getPaddlePriceId(plan.id);
  if (!priceId) {
    return { ok: false, code: 'checkout_unavailable', error: 'Paddle price id tanımlı değil.', status: 503 };
  }

  const body = {
    collection_mode: 'automatic',
    items: [{ price_id: priceId, quantity: 1 }],
    custom_data: {
      userId: auth.user.id,
      planId: plan.id,
    },
  };

  const checkoutUrl = getPaddleCheckoutUrl();
  if (checkoutUrl) {
    body.checkout = { url: checkoutUrl };
  }

  try {
    const response = await fetch(`${getPaddleApiBase().replace(/\/+$/, '')}/transactions`, {
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
      const detail = parseProviderError(payload, `Paddle checkout başlatılamadı (${response.status})`);
      return { ok: false, code: 'checkout_unavailable', error: detail, status: 503 };
    }

    const url = cleanString(payload?.data?.checkout?.url);
    if (!url) {
      return { ok: false, code: 'checkout_unavailable', error: 'Paddle checkout URL boş döndü.', status: 503 };
    }

    return {
      ok: true,
      checkoutUrl: url,
      externalCheckoutId: cleanString(payload?.data?.id),
      provider: 'paddle',
    };
  } catch {
    return { ok: false, code: 'checkout_unavailable', error: 'Paddle servisine bağlanılamadı.', status: 503 };
  }
}

async function resolveCheckout(auth, plan) {
  const provider = getBillingProvider();

  if (provider === 'stripe') return createStripeCheckout(auth, plan);
  if (provider === 'paddle') return createPaddleCheckout(auth, plan);

  const checkoutUrl = getCheckoutUrl(plan.id);
  if (!checkoutUrl) {
    return { ok: false, code: 'checkout_unavailable', error: 'Checkout URL tanımlı değil.', status: 503 };
  }

  return {
    ok: true,
    checkoutUrl: buildManualCheckoutUrl(checkoutUrl, auth.user.id, plan.id),
    externalCheckoutId: '',
    provider: provider || 'manual',
  };
}

function sanitizeUser(user) {
  if (!user || typeof user !== 'object') return null;
  return {
    id: cleanString(user.id),
    email: cleanString(user.email),
    name: cleanString(user.name),
  };
}

async function handleStartCheckout(res, auth, body) {
  if (!auth) return res.status(401).json({ error: 'Checkout için giriş gerekli.' });

  const plan = getPlanById(cleanString(body.planId).toLowerCase());
  if (!plan || plan.id === 'free') {
    return res.status(400).json({ error: 'Geçersiz plan seçimi.' });
  }

  const checkoutResult = await resolveCheckout(auth, plan);
  if (!checkoutResult.ok) {
    return res.status(checkoutResult.status || 503).json({
      error: checkoutResult.error || 'Checkout başlatılamadı.',
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

async function handleActivateDev(res, auth, body) {
  if (!auth) return res.status(401).json({ error: 'Dev aktivasyon için giriş gerekli.' });
  if (!isDevActivationAllowed()) {
    return res.status(403).json({ error: 'Dev aktivasyon production ortamda kapalı.' });
  }

  const plan = getPlanById(cleanString(body.planId).toLowerCase());
  if (!plan) return res.status(400).json({ error: 'Geçersiz plan seçimi.' });

  const entitlement = await writeEntitlementForUser(auth.user.id, {
    tier: plan.id,
    status: 'active',
    source: 'dev',
    cancelAtPeriodEnd: false,
  });

  return res.status(200).json({ ok: true, entitlement });
}

async function handleInstantUpgrade(res, auth, body) {
  if (!auth) return res.status(401).json({ error: 'Pro aktivasyonu için giriş gerekli.' });

  const plan = getPlanById(cleanString(body.planId).toLowerCase());
  if (!plan || plan.id !== 'pro') {
    return res.status(400).json({ error: 'Geçersiz plan seçimi.' });
  }

  const activatedAt = new Date().toISOString();
  const entitlement = await writeEntitlementForUser(auth.user.id, {
    tier: plan.id,
    status: 'active',
    source: 'instant-upgrade',
    cancelAtPeriodEnd: false,
    updatedAt: activatedAt,
  });

  const nextUser = {
    ...auth.user,
    isPro: true,
    proActivatedAt: activatedAt,
    profile: {
      ...(auth.user.profile || {}),
      isPro: true,
      proActivatedAt: activatedAt,
    },
    updatedAt: activatedAt,
  };

  try {
    if (hasSupabaseAuthUsersConfig()) {
      await updateSupabaseUser(nextUser);
    }
  } catch (error) {
    console.warn('[billing] Supabase Pro sync skipped.', error?.message || error);
  }

  await hydrateRuntimeUserCache(nextUser);

  return res.status(200).json({ ok: true, entitlement });
}

async function handleCancel(res, auth) {
  if (!auth) return res.status(401).json({ error: 'İptal için giriş gerekli.' });
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
  if (!setCorsHeaders(req, res, { methods: 'GET, POST, OPTIONS' })) {
    return res.status(403).json({ error: 'Bu origin için erişim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rate = await billingStore.checkRateLimit(`billing:${getClientIP(req)}`);
  if (!rate.allowed) {
    const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'Çok fazla billing isteği', retryAfter });
  }

  const auth = await readAuthSession(req);
  const plans = getPlanCatalog();

  if (req.method === 'GET') {
    const entitlement = auth ? await readEntitlementForUser(auth.user.id) : normalizeEntitlement(null);
    const plan = entitlement.tier === 'pro' && entitlement.status !== 'canceled' ? 'pro' : 'free';
    const expiresAt = cleanString(entitlement.expiresAt) || null;
    return res.status(200).json({
      plan,
      expiresAt,
      provider: getBillingProvider(),
      plans,
      entitlement,
      user: sanitizeUser(auth?.user || null),
      devActivationAllowed: isDevActivationAllowed(),
    });
  }

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Geçersiz JSON gövdesi' });
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > BILLING_MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'İstek çok büyük' });
  }

  const action = cleanString(body.action).toLowerCase();
  if (!action) return res.status(400).json({ error: 'action gerekli' });

  if (action === 'start_checkout') return handleStartCheckout(res, auth, body);
  if (action === 'activate_dev_plan') return handleActivateDev(res, auth, body);
  if (action === 'instant_upgrade') return handleInstantUpgrade(res, auth, body);
  if (action === 'cancel_subscription') return handleCancel(res, auth);

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
