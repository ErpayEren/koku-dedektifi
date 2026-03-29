const crypto = require('crypto');
const { createRuntimeStore } = require('../lib/server/runtime-store');

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'X-Robots-Tag': 'noindex, nofollow',
};

const MAX_BODY_BYTES = 32 * 1024;
const BILLING_TTL_MS = 400 * 24 * 60 * 60 * 1000;
const WEBHOOK_EVENT_TTL_MS = 45 * 24 * 60 * 60 * 1000;
const WEBHOOK_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const WEBHOOK_RATE_LIMIT_MAX = 120;
const PLAN_ID_RE = /^[a-z0-9_-]{2,24}$/i;
const EVENT_ID_RE = /^[a-z0-9._:-]{6,120}$/i;

const billingStore = createRuntimeStore({
  cacheTtlMs: BILLING_TTL_MS,
  cacheMaxEntries: 20000,
  keyPrefix: 'koku-billing',
});

const webhookStore = createRuntimeStore({
  rateLimitWindowMs: WEBHOOK_RATE_LIMIT_WINDOW_MS,
  rateLimitMax: WEBHOOK_RATE_LIMIT_MAX,
  cacheTtlMs: WEBHOOK_EVENT_TTL_MS,
  cacheMaxEntries: 30000,
  keyPrefix: 'koku-billing-webhook',
});

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function setSecurityHeaders(res) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(key, value);
  }
}

function hashSha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';
}

function entitlementKey(userId) {
  return `entitlement:user:${userId}`;
}

function processedEventKey(eventId) {
  return `event:${eventId}`;
}

function parsePlanId(planId) {
  const id = cleanString(planId).toLowerCase();
  if (!PLAN_ID_RE.test(id)) return '';
  if (id === 'free' || id === 'pro' || id === 'studio') return id;
  return '';
}

function parsePlanAlias(planHint) {
  const value = cleanString(planHint).toLowerCase();
  if (!value) return '';
  if (value === 'free' || /^free(?:[-_].+)?$/.test(value)) return 'free';
  if (value === 'pro' || /^pro(?:[-_].+)?$/.test(value)) return 'pro';
  if (value === 'studio' || /^studio(?:[-_].+)?$/.test(value)) return 'studio';
  return '';
}

function normalizeEntitlement(entry) {
  const src = entry && typeof entry === 'object' ? entry : {};
  const tier = parsePlanId(src.tier) || 'free';
  const status = cleanString(src.status).toLowerCase() || 'active';
  return {
    tier,
    status,
    source: cleanString(src.source) || 'default',
    updatedAt: cleanString(src.updatedAt) || null,
    checkoutPlanId: cleanString(src.checkoutPlanId) || '',
    checkoutStartedAt: cleanString(src.checkoutStartedAt) || null,
    cancelAtPeriodEnd: src.cancelAtPeriodEnd === true,
  };
}

function readRawBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  return '';
}

function parseJson(raw) {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function getHeader(req, headerName) {
  const target = cleanString(headerName).toLowerCase();
  if (!target) return '';
  const headers = req.headers && typeof req.headers === 'object' ? req.headers : {};
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() !== target) continue;
    if (Array.isArray(value)) return cleanString(value[0]);
    return cleanString(value);
  }
  return '';
}

function getSignatureHeaderName() {
  return cleanString(process.env.BILLING_WEBHOOK_SIGNATURE_HEADER).toLowerCase() || 'x-billing-signature';
}

function parseGenericSignature(rawHeader) {
  const raw = cleanString(rawHeader);
  if (!raw) return '';

  const directMatch = raw.match(/^[a-f0-9]{64}$/i);
  if (directMatch) return raw.toLowerCase();

  const shaMatch = raw.match(/sha256=([a-f0-9]{64})/i);
  if (shaMatch) return shaMatch[1].toLowerCase();

  const v1Match = raw.match(/v1=([a-f0-9]{64})/i);
  if (v1Match) return v1Match[1].toLowerCase();

  return '';
}

function parseStripeSignature(rawHeader) {
  const raw = cleanString(rawHeader);
  if (!raw) return null;

  const tsMatch = raw.match(/(?:^|,)\s*t=(\d{1,14})(?:\s*,|$)/i);
  const sigMatch = raw.match(/(?:^|,)\s*v1=([a-f0-9]{64})(?:\s*,|$)/i);
  if (!tsMatch || !sigMatch) return null;

  const timestamp = Number.parseInt(tsMatch[1], 10);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;

  return {
    timestamp,
    signature: sigMatch[1].toLowerCase(),
  };
}

function parsePaddleSignature(rawHeader) {
  const raw = cleanString(rawHeader);
  if (!raw) return null;

  const parts = raw.split(';').map((part) => part.trim()).filter(Boolean);
  let timestamp = 0;
  const signatures = [];

  for (const part of parts) {
    const separatorIdx = part.indexOf('=');
    if (separatorIdx <= 0) continue;
    const key = cleanString(part.slice(0, separatorIdx)).toLowerCase();
    const value = cleanString(part.slice(separatorIdx + 1));

    if (key === 'ts') {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        timestamp = parsed;
      }
      continue;
    }

    if (key === 'h1' && /^[a-f0-9]{64}$/i.test(value)) {
      signatures.push(value.toLowerCase());
    }
  }

  if (!timestamp || signatures.length === 0) return null;
  return { timestamp, signatures };
}

function verifyGenericSignature(rawBody, signature, secret) {
  if (!signature) {
    return { ok: false, status: 401, error: 'Webhook imzasi eksik.' };
  }

  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  if (signature.length !== expected.length) {
    return { ok: false, status: 401, error: 'Webhook imzasi gecersiz.' };
  }

  try {
    const valid = crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
    if (!valid) return { ok: false, status: 401, error: 'Webhook imzasi gecersiz.' };
  } catch {
    return { ok: false, status: 401, error: 'Webhook imzasi gecersiz.' };
  }

  return { ok: true };
}

function verifyStripeSignature(rawBody, parsed, secret) {
  if (!parsed || !parsed.signature || !parsed.timestamp) {
    return { ok: false, status: 401, error: 'Stripe imzasi eksik veya gecersiz.' };
  }

  const toleranceSecRaw = Number.parseInt(cleanString(process.env.BILLING_WEBHOOK_STRIPE_TOLERANCE_SEC) || '300', 10);
  const toleranceSec = Number.isFinite(toleranceSecRaw) && toleranceSecRaw > 0 ? toleranceSecRaw : 300;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - parsed.timestamp) > toleranceSec) {
    return { ok: false, status: 401, error: 'Stripe imza zamani gecersiz.' };
  }

  const signedPayload = `${parsed.timestamp}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
  if (parsed.signature.length !== expected.length) {
    return { ok: false, status: 401, error: 'Stripe imzasi gecersiz.' };
  }

  try {
    const valid = crypto.timingSafeEqual(Buffer.from(parsed.signature, 'hex'), Buffer.from(expected, 'hex'));
    if (!valid) return { ok: false, status: 401, error: 'Stripe imzasi gecersiz.' };
  } catch {
    return { ok: false, status: 401, error: 'Stripe imzasi gecersiz.' };
  }

  return { ok: true };
}

function verifyPaddleSignature(rawBody, parsed, secret) {
  if (!parsed || !parsed.timestamp || !Array.isArray(parsed.signatures) || parsed.signatures.length === 0) {
    return { ok: false, status: 401, error: 'Paddle imzasi eksik veya gecersiz.' };
  }

  const toleranceSecRaw = Number.parseInt(cleanString(process.env.BILLING_WEBHOOK_PADDLE_TOLERANCE_SEC) || '300', 10);
  const toleranceSec = Number.isFinite(toleranceSecRaw) && toleranceSecRaw > 0 ? toleranceSecRaw : 300;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - parsed.timestamp) > toleranceSec) {
    return { ok: false, status: 401, error: 'Paddle imza zamani gecersiz.' };
  }

  const signedPayload = `${parsed.timestamp}:${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');

  for (const signature of parsed.signatures) {
    if (signature.length !== expected.length) continue;
    try {
      const valid = crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
      if (valid) return { ok: true };
    } catch {}
  }

  return { ok: false, status: 401, error: 'Paddle imzasi gecersiz.' };
}

function verifyWebhookSignatureFromRequest(req, rawBody) {
  const secret = cleanString(process.env.BILLING_WEBHOOK_SECRET);
  if (!secret) {
    return { ok: false, status: 503, error: 'BILLING_WEBHOOK_SECRET tanimli degil.' };
  }

  const paddleSignatureRaw = getHeader(req, 'paddle-signature');
  const parsedPaddle = parsePaddleSignature(paddleSignatureRaw);
  if (parsedPaddle) {
    return verifyPaddleSignature(rawBody, parsedPaddle, secret);
  }

  const stripeSignatureRaw = getHeader(req, 'stripe-signature');
  const parsedStripe = parseStripeSignature(stripeSignatureRaw);
  if (parsedStripe) {
    return verifyStripeSignature(rawBody, parsedStripe, secret);
  }

  const configuredHeaderRaw = getHeader(req, getSignatureHeaderName());
  const genericSignature = parseGenericSignature(configuredHeaderRaw);
  return verifyGenericSignature(rawBody, genericSignature, secret);
}

function getEventType(payload) {
  return cleanString(payload?.type || payload?.event_type).toLowerCase();
}

function normalizeEventType(rawType) {
  const eventType = cleanString(rawType).toLowerCase();
  if (!eventType) return '';

  if (eventType === 'subscription.created') return 'subscription.activated';
  if (eventType === 'subscription.trialing') return 'subscription.activated';
  if (eventType === 'subscription.resumed') return 'subscription.renewed';
  if (eventType === 'subscription.past_due') return 'subscription.payment_failed';
  if (eventType === 'transaction.completed') return 'subscription.renewed';
  if (eventType === 'transaction.paid') return 'subscription.renewed';

  if (eventType === 'checkout.session.completed') return 'subscription.activated';
  if (eventType === 'customer.subscription.created') return 'subscription.activated';
  if (eventType === 'customer.subscription.updated') return 'subscription.updated';
  if (eventType === 'customer.subscription.deleted') return 'subscription.canceled';
  if (eventType === 'invoice.payment_failed') return 'subscription.payment_failed';
  if (eventType === 'invoice.paid') return 'subscription.renewed';
  if (eventType === 'checkout.session.async_payment_succeeded') return 'subscription.renewed';

  return eventType;
}

function normalizeEventId(payload, rawBody) {
  const direct = cleanString(payload?.id || payload?.event_id);
  if (EVENT_ID_RE.test(direct)) return direct;
  return `raw_${hashSha256(rawBody).slice(0, 40)}`;
}

function getEventData(payload) {
  if (payload?.data && typeof payload.data === 'object') {
    if (payload.data.object && typeof payload.data.object === 'object') {
      return payload.data.object;
    }
    return payload.data;
  }
  return {};
}

function mapPriceIdToPlanId(priceId) {
  const normalized = cleanString(priceId).toLowerCase();
  if (!normalized) return '';

  const known = [
    { plan: 'pro', id: cleanString(process.env.BILLING_PADDLE_PRICE_ID_PRO).toLowerCase() },
    { plan: 'studio', id: cleanString(process.env.BILLING_PADDLE_PRICE_ID_STUDIO).toLowerCase() },
    { plan: 'pro', id: cleanString(process.env.BILLING_STRIPE_PRICE_ID_PRO).toLowerCase() },
    { plan: 'studio', id: cleanString(process.env.BILLING_STRIPE_PRICE_ID_STUDIO).toLowerCase() },
  ];

  const hit = known.find((entry) => entry.id && entry.id === normalized);
  return hit ? hit.plan : '';
}

function pickUserId(data) {
  return cleanString(
    data?.userId
    || data?.user_id
    || data?.customerUserId
    || data?.customer_user_id
    || data?.client_reference_id
    || data?.custom_data?.userId
    || data?.custom_data?.user_id
    || data?.metadata?.userId
    || data?.metadata?.user_id,
  );
}

function pickPlanId(data) {
  const direct = parsePlanId(
    data?.planId
    || data?.plan_id
    || data?.priceId
    || data?.price_id
    || data?.custom_data?.planId
    || data?.custom_data?.plan_id
    || data?.metadata?.planId
    || data?.metadata?.plan_id,
  );
  if (direct) return direct;

  const directPriceId = cleanString(
    data?.items?.[0]?.price?.id
    || data?.items?.[0]?.price_id
    || data?.items?.data?.[0]?.price?.id
    || data?.items?.data?.[0]?.price_id
    || data?.price?.id
    || data?.price_id,
  );
  const mappedById = mapPriceIdToPlanId(directPriceId);
  if (mappedById) return mappedById;

  const stripeHint = cleanString(
    data?.items?.data?.[0]?.price?.lookup_key
    || data?.items?.data?.[0]?.price?.nickname
    || data?.items?.data?.[0]?.plan?.id
    || data?.plan?.id,
  );
  return parsePlanAlias(stripeHint);
}

function normalizeStatus(eventType, incomingStatus) {
  const explicit = cleanString(incomingStatus).toLowerCase();
  if (explicit) return explicit;

  if (eventType === 'subscription.canceled') return 'canceled';
  if (eventType === 'subscription.payment_failed') return 'past_due';
  return 'active';
}

async function readEntitlement(userId) {
  const row = await billingStore.getCache(entitlementKey(userId));
  return normalizeEntitlement(row);
}

async function writeEntitlement(userId, next) {
  const normalized = normalizeEntitlement({
    ...next,
    updatedAt: new Date().toISOString(),
  });
  await billingStore.setCache(entitlementKey(userId), normalized);
  return normalized;
}

async function markProcessed(eventId, payload = {}) {
  await webhookStore.setCache(processedEventKey(eventId), {
    ...payload,
    processedAt: new Date().toISOString(),
  });
}

function isSupportedEvent(eventType) {
  return (
    eventType === 'subscription.activated'
    || eventType === 'subscription.renewed'
    || eventType === 'subscription.canceled'
    || eventType === 'subscription.payment_failed'
    || eventType === 'subscription.updated'
  );
}

async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-billing-signature, stripe-signature, paddle-signature');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIP(req);
  const rate = await webhookStore.checkRateLimit(`webhook:${ip}`);
  if (!rate.allowed) {
    const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'Cok fazla webhook istegi', retryAfter });
  }

  const rawBody = readRawBody(req);
  if (!rawBody) return res.status(400).json({ error: 'Webhook govdesi bos.' });
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'Webhook govdesi cok buyuk.' });
  }

  const payload = parseJson(rawBody);
  if (!payload) return res.status(400).json({ error: 'Gecersiz JSON webhook govdesi.' });

  const signatureCheck = verifyWebhookSignatureFromRequest(req, rawBody);
  if (!signatureCheck.ok) {
    return res.status(signatureCheck.status).json({ error: signatureCheck.error });
  }

  const rawEventType = getEventType(payload);
  const eventType = normalizeEventType(rawEventType);
  if (!eventType) return res.status(400).json({ error: 'Webhook event type eksik.' });

  const eventId = normalizeEventId(payload, rawBody);
  const alreadyProcessed = await webhookStore.getCache(processedEventKey(eventId));
  if (alreadyProcessed) {
    return res.status(200).json({ ok: true, duplicate: true, eventId });
  }

  if (!isSupportedEvent(eventType)) {
    await markProcessed(eventId, { ignored: true, eventType, rawEventType });
    return res.status(202).json({ ok: true, ignored: true, eventType, rawEventType, eventId });
  }

  const data = getEventData(payload);
  const userId = pickUserId(data);
  if (!userId) return res.status(400).json({ error: 'Webhook userId bulunamadi.' });

  const current = await readEntitlement(userId);
  const nextPlanId = pickPlanId(data) || current.tier || 'free';
  const status = normalizeStatus(eventType, data?.status);
  const cancelAtPeriodEnd = typeof data?.cancelAtPeriodEnd === 'boolean'
    ? data.cancelAtPeriodEnd
    : (status === 'canceled');
  const provider = cleanString(payload?.provider || process.env.BILLING_PROVIDER) || 'manual';

  const entitlement = await writeEntitlement(userId, {
    ...current,
    tier: nextPlanId,
    status,
    source: `webhook:${provider}`,
    cancelAtPeriodEnd,
  });

  await markProcessed(eventId, {
    eventType,
    rawEventType,
    userId,
    tier: entitlement.tier,
    status: entitlement.status,
  });

  return res.status(200).json({ ok: true, eventId, entitlement });
}

handler.config = {
  api: {
    bodyParser: {
      sizeLimit: '40kb',
    },
  },
};

module.exports = handler;
