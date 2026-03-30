const { createRuntimeStore } = require('./runtime-store');

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 250;

const runtimeStore = createRuntimeStore({
  rateLimitWindowMs: RATE_LIMIT_WINDOW_MS,
  rateLimitMax: RATE_LIMIT_MAX,
  cacheTtlMs: CACHE_TTL_MS,
  cacheMaxEntries: CACHE_MAX_ENTRIES,
});

function hashRequest(payload) {
  const str = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return hash.toString(36);
}

function buildCacheKey(req) {
  const body = req?.body && typeof req.body === 'object' ? req.body : {};
  const provider = typeof req?.provider === 'string' ? req.provider : 'unknown';

  return hashRequest({
    analysisVersion: 'v2',
    provider,
    promptType: body.promptType || 'analysis',
    promptExtra: body.promptExtra || '',
    useWebSearch: false,
    messages: Array.isArray(body.messages) ? body.messages : [],
  });
}

async function getCached(key) {
  return runtimeStore.getCache(key);
}

async function setCached(key, value) {
  await runtimeStore.setCache(key, value);
}

async function checkRateLimit(ip) {
  return runtimeStore.checkRateLimit(ip);
}

function getStoreBackendName() {
  return runtimeStore.getBackendName();
}

module.exports = {
  buildCacheKey,
  checkRateLimit,
  getCached,
  getStoreBackendName,
  setCached,
};
