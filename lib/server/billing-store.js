const { createRuntimeStore } = require('./runtime-store');
const { cleanString } = require('./config');

const BILLING_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const BILLING_RATE_LIMIT_MAX = 30;
const BILLING_TTL_MS = 400 * 24 * 60 * 60 * 1000;
const PLAN_ID_RE = /^[a-z0-9_-]{2,24}$/i;

const billingStore = createRuntimeStore({
  rateLimitWindowMs: BILLING_RATE_LIMIT_WINDOW_MS,
  rateLimitMax: BILLING_RATE_LIMIT_MAX,
  cacheTtlMs: BILLING_TTL_MS,
  cacheMaxEntries: 20000,
  keyPrefix: 'koku-billing',
});

function cleanNumber(value, fallback) {
  const parsed = Number.parseFloat(cleanString(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function entitlementKey(userId) {
  return `entitlement:user:${cleanString(userId)}`;
}

function checkoutKey(userId) {
  return `checkout:user:${cleanString(userId)}`;
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

function getBillingProvider() {
  return cleanString(process.env.BILLING_PROVIDER).toLowerCase() || 'manual';
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

function getPlanCatalog() {
  const currency = cleanString(process.env.BILLING_CURRENCY) || 'TRY';
  const interval = cleanString(process.env.BILLING_INTERVAL) || 'month';

  return [
    {
      id: 'free',
      name: 'Ucretsiz',
      price: 0,
      currency,
      interval,
      featured: false,
      features: ['Günlük 3 analiz', 'Temel nota analizi', '5 parfüm dolap limiti', 'Molekül önizlemesi (sadece isim)'],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: cleanNumber(process.env.BILLING_PRICE_PRO, 49),
      currency,
      interval,
      featured: true,
      features: [
        'Sınırsız analiz',
        'Tam molekül analizi ve detay sayfaları',
        'Sınırsız dolap',
        'Top 10 benzer parfüm önerisi',
        'Koku profili ve kişiselleştirme',
        'Parfümör Gözüyle derin rapor',
        'Öncelikli destek',
      ],
    },
  ];
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

module.exports = {
  billingStore,
  cleanNumber,
  entitlementKey,
  checkoutKey,
  normalizeEntitlement,
  getBillingProvider,
  isDevActivationAllowed,
  getPlanCatalog,
  getPlanById,
  readEntitlementForUser,
  writeEntitlementForUser,
};
