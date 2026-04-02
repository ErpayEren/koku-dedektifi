const crypto = require('crypto');
const { Redis } = require('@upstash/redis');
const { cleanString } = require('./config');
const { readAuthSession } = require('./auth-session');
const { readEntitlementForUser } = require('./billing-store');

let redisClient = null;

function resolveRedisEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';

  if (!url || !token) {
    throw new Error('Redis REST env must be set (UPSTASH_REDIS_REST_* or KV_REST_API_*)');
  }

  return { url, token };
}

function getRedisClient() {
  if (redisClient) return redisClient;
  const { url, token } = resolveRedisEnv();
  redisClient = new Redis({ url, token });
  return redisClient;
}

function hashValue(value) {
  return crypto.createHash('sha256').update(String(value || 'unknown')).digest('hex').slice(0, 24);
}

function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function comparePlan(currentPlan, minPlan) {
  const order = { free: 0, pro: 1 };
  return (order[currentPlan] || 0) >= (order[minPlan] || 0);
}

async function incrementCounter(key, ttlSeconds) {
  const redis = getRedisClient();
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, ttlSeconds);
  }
  return count;
}

async function requirePlan(req, minPlan = 'free') {
  const auth = await readAuthSession(req);
  if (!auth) {
    const plan = 'free';
    if (!comparePlan(plan, minPlan)) {
      const error = new Error('Pro plan gerekli.');
      error.statusCode = 403;
      error.body = { error: 'Pro plan gerekli.', upgrade: '/paketler' };
      throw error;
    }

    return {
      userId: `anon:${hashValue(getClientIP(req))}`,
      plan,
      user: null,
    };
  }

  const entitlement = await readEntitlementForUser(auth.user.id);
  const plan = entitlement.tier === 'pro' ? 'pro' : 'free';
  if (!comparePlan(plan, minPlan)) {
    const error = new Error('Pro plan gerekli.');
    error.statusCode = 403;
    error.body = { error: 'Pro plan gerekli.', upgrade: '/paketler' };
    throw error;
  }

  return {
    userId: cleanString(auth.user.id),
    plan,
    user: auth.user,
  };
}

async function enforceDailyAnalysisQuota(req) {
  const session = await requirePlan(req, 'free');
  const limit = session.plan === 'pro' ? 9999 : 3;
  const key = `rl:daily:${session.userId}:analysis`;
  const count = await incrementCounter(key, 86400);

  if (count > limit) {
    const error = new Error('Günlük analiz limitine ulaştınız.');
    error.statusCode = 429;
    error.body = {
      error: 'Günlük analiz limitine ulaştınız.',
      limit,
      retryAfter: 'yarın',
      upgrade: '/paketler',
      plan: session.plan,
    };
    throw error;
  }

  return {
    ...session,
    limit,
    remaining: Math.max(0, limit - count),
  };
}

module.exports = {
  requirePlan,
  enforceDailyAnalysisQuota,
};
