const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_CACHE_LIMIT = 250;
const GLOBAL_FILE_STORE_MAP_KEY = '__kokuRuntimeFileStoreMap';

function getSharedFileStoreMap() {
  if (!globalThis[GLOBAL_FILE_STORE_MAP_KEY]) {
    Object.defineProperty(globalThis, GLOBAL_FILE_STORE_MAP_KEY, {
      value: new Map(),
      writable: false,
      enumerable: false,
      configurable: false,
    });
  }
  return globalThis[GLOBAL_FILE_STORE_MAP_KEY];
}

function cleanString(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parsePositiveInt(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  const cleaned = cleanString(String(value ?? '')).toLowerCase();
  if (!cleaned) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(cleaned)) return true;
  if (['0', 'false', 'no', 'off'].includes(cleaned)) return false;
  return fallback;
}

function isVercelProduction() {
  return cleanString(process.env.VERCEL_ENV).toLowerCase() === 'production';
}

function hashKey(value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return Math.abs(hash).toString(36);
}

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function normalizeRedisValue(payload) {
  if (payload && typeof payload === 'object' && 'result' in payload) {
    return payload.result;
  }
  return payload;
}

function getRedisCredentials() {
  const url = cleanString(process.env.KV_REST_API_URL)
    || cleanString(process.env.UPSTASH_REDIS_REST_URL)
    || cleanString(process.env.REDIS_REST_URL);
  const token = cleanString(process.env.KV_REST_API_TOKEN)
    || cleanString(process.env.UPSTASH_REDIS_REST_TOKEN)
    || cleanString(process.env.REDIS_REST_TOKEN);

  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

function getLocalStateFilePath(explicitPath) {
  const candidate = cleanString(explicitPath) || cleanString(process.env.API_STATE_FILE);
  if (candidate) {
    return path.isAbsolute(candidate) ? candidate : path.join(process.cwd(), candidate);
  }

  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), 'koku-dedektifi-api-store.json');
  }

  return path.join(process.cwd(), '.runtime', 'api-store.json');
}

function pruneState(state, now) {
  let dirty = false;

  for (const [key, entry] of Object.entries(state.cache || {})) {
    if (!entry || now > Number(entry.expiresAt || 0)) {
      delete state.cache[key];
      dirty = true;
    }
  }

  for (const [key, entry] of Object.entries(state.rateLimits || {})) {
    if (!entry || now > Number(entry.resetAt || 0)) {
      delete state.rateLimits[key];
      dirty = true;
    }
  }

  return dirty;
}

function enforceCacheLimit(cache, limit) {
  const entries = Object.entries(cache || {});
  if (entries.length <= limit) return false;

  entries.sort((a, b) => Number(a[1]?.createdAt || 0) - Number(b[1]?.createdAt || 0));
  let dirty = false;

  while (entries.length > limit) {
    const [oldestKey] = entries.shift();
    delete cache[oldestKey];
    dirty = true;
  }

  return dirty;
}

function createMemoryStore({ rateLimitWindowMs, rateLimitMax, cacheTtlMs, cacheMaxEntries, keyPrefix }) {
  const cache = new Map();
  const rateLimits = new Map();

  return {
    name: 'memory',
    durable: false,
    async checkRateLimit(ip) {
      const now = Date.now();
      const key = `${keyPrefix}:rl:${hashKey(ip)}`;
      const entry = rateLimits.get(key);

      if (!entry || now > entry.resetAt) {
        rateLimits.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
        return { allowed: true, remaining: rateLimitMax - 1, resetAt: now + rateLimitWindowMs };
      }

      if (entry.count >= rateLimitMax) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt };
      }

      entry.count += 1;
      return { allowed: true, remaining: Math.max(0, rateLimitMax - entry.count), resetAt: entry.resetAt };
    },
    async getCache(cacheKey) {
      const key = `${keyPrefix}:cache:${cacheKey}`;
      const entry = cache.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
      }
      return entry.data;
    },
    async setCache(cacheKey, data) {
      const key = `${keyPrefix}:cache:${cacheKey}`;
      if (cache.size >= cacheMaxEntries) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey) cache.delete(oldestKey);
      }
      cache.set(key, {
        data,
        createdAt: Date.now(),
        expiresAt: Date.now() + cacheTtlMs,
      });
    },
  };
}

function createFileStore({ rateLimitWindowMs, rateLimitMax, cacheTtlMs, cacheMaxEntries, keyPrefix, localFilePath }) {
  const filePath = getLocalStateFilePath(localFilePath);
  const sharedMap = getSharedFileStoreMap();
  if (!sharedMap.has(filePath)) {
    sharedMap.set(filePath, {
      loaded: false,
      state: { cache: {}, rateLimits: {} },
      writeChain: Promise.resolve(),
    });
  }
  const shared = sharedMap.get(filePath);

  async function ensureLoaded() {
    if (shared.loaded) return;
    try {
      const raw = await fs.promises.readFile(filePath, 'utf8');
      const parsed = safeJsonParse(raw, null);
      if (parsed && typeof parsed === 'object') {
        shared.state = {
          cache: parsed.cache && typeof parsed.cache === 'object' ? parsed.cache : {},
          rateLimits: parsed.rateLimits && typeof parsed.rateLimits === 'object' ? parsed.rateLimits : {},
        };
      } else {
        shared.state = { cache: {}, rateLimits: {} };
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
      shared.state = { cache: {}, rateLimits: {} };
    }
    shared.loaded = true;
  }

  async function persist() {
    shared.writeChain = shared.writeChain.then(async () => {
      const snapshot = JSON.stringify(shared.state);
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, snapshot, 'utf8');
    });
    return shared.writeChain;
  }

  return {
    name: 'file',
    durable: !process.env.VERCEL,
    async checkRateLimit(ip) {
      await ensureLoaded();
      const now = Date.now();
      let dirty = pruneState(shared.state, now);
      const key = `${keyPrefix}:rl:${hashKey(ip)}`;
      const entry = shared.state.rateLimits[key];

      if (!entry || now > Number(entry.resetAt || 0)) {
        shared.state.rateLimits[key] = { count: 1, resetAt: now + rateLimitWindowMs };
        dirty = true;
        await persist();
        return { allowed: true, remaining: rateLimitMax - 1, resetAt: now + rateLimitWindowMs };
      }

      if (entry.count >= rateLimitMax) {
        if (dirty) await persist();
        return { allowed: false, remaining: 0, resetAt: entry.resetAt };
      }

      entry.count += 1;
      dirty = true;
      await persist();
      return { allowed: true, remaining: Math.max(0, rateLimitMax - entry.count), resetAt: entry.resetAt };
    },
    async getCache(cacheKey) {
      await ensureLoaded();
      const now = Date.now();
      const dirty = pruneState(shared.state, now);
      const key = `${keyPrefix}:cache:${cacheKey}`;
      const entry = shared.state.cache[key];

      if (!entry) {
        if (dirty) await persist();
        return null;
      }

      if (now > Number(entry.expiresAt || 0)) {
        delete shared.state.cache[key];
        await persist();
        return null;
      }

      if (dirty) await persist();
      return entry.data;
    },
    async setCache(cacheKey, data) {
      await ensureLoaded();
      const now = Date.now();
      pruneState(shared.state, now);

      const key = `${keyPrefix}:cache:${cacheKey}`;
      shared.state.cache[key] = {
        data,
        createdAt: now,
        expiresAt: now + cacheTtlMs,
      };

      enforceCacheLimit(shared.state.cache, cacheMaxEntries);
      await persist();
    },
  };
}

function createRedisStore({ rateLimitWindowMs, rateLimitMax, cacheTtlMs, keyPrefix }) {
  const creds = getRedisCredentials();
  if (!creds) return null;

  async function readJson(response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  async function command(args) {
    const response = await fetch(creds.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${creds.token}`,
      },
      body: JSON.stringify(args),
    });

    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(payload?.error || `Redis command failed (${response.status})`);
    }

    const result = normalizeRedisValue(payload);
    if (result && typeof result === 'object' && 'error' in result) {
      throw new Error(String(result.error));
    }
    return result;
  }

  return {
    name: 'redis-rest',
    durable: true,
    async checkRateLimit(ip) {
      const key = `${keyPrefix}:rl:${hashKey(ip)}`;
      const countRaw = await command(['INCR', key]);
      const count = Number(countRaw || 0);

      let ttl = Number(await command(['PTTL', key]));
      if (count <= 1 || !Number.isFinite(ttl) || ttl < 0) {
        await command(['PEXPIRE', key, rateLimitWindowMs]);
        ttl = rateLimitWindowMs;
      }

      return {
        allowed: count <= rateLimitMax,
        remaining: Math.max(0, rateLimitMax - count),
        resetAt: Date.now() + Math.max(0, ttl),
      };
    },
    async getCache(cacheKey) {
      const raw = await command(['GET', `${keyPrefix}:cache:${cacheKey}`]);
      if (!raw) return null;
      const parsed = safeJsonParse(raw, null);
      return parsed?.data || null;
    },
    async setCache(cacheKey, data) {
      await command([
        'SET',
        `${keyPrefix}:cache:${cacheKey}`,
        JSON.stringify({ data, createdAt: Date.now() }),
        'PX',
        cacheTtlMs,
      ]);
    },
  };
}

function createRuntimeStore(options = {}) {
  const config = {
    rateLimitWindowMs: parsePositiveInt(options.rateLimitWindowMs, 60 * 1000),
    rateLimitMax: parsePositiveInt(options.rateLimitMax, 10),
    cacheTtlMs: parsePositiveInt(options.cacheTtlMs, 10 * 60 * 1000),
    cacheMaxEntries: parsePositiveInt(options.cacheMaxEntries, DEFAULT_CACHE_LIMIT),
    keyPrefix: cleanString(options.keyPrefix) || cleanString(process.env.KV_KEY_PREFIX) || 'koku-dedektifi',
    localFilePath: options.localFilePath,
    allowNonDurableFallback: parseBoolean(
      options.allowNonDurableFallback,
      parseBoolean(process.env.ALLOW_NON_DURABLE_STORE, !isVercelProduction())
    ),
  };

  const stores = [
    createRedisStore(config),
    createFileStore(config),
    createMemoryStore(config),
  ].filter(Boolean);
  const durableCandidates = stores.filter((store) => store.durable);
  const hasDurableCandidate = durableCandidates.length > 0;

  if (!config.allowNonDurableFallback && !hasDurableCandidate) {
    console.error('[runtime-store] Durable backend required, but Redis/KV credentials are missing.');
  }

  let activeIndex = 0;
  if (!config.allowNonDurableFallback && hasDurableCandidate) {
    activeIndex = stores.findIndex((store) => store.durable);
  }

  async function execute(methodName, ...args) {
    let lastError = null;
    let skippedNonDurable = 0;

    for (let index = activeIndex; index < stores.length; index++) {
      const store = stores[index];
      if (!config.allowNonDurableFallback && !store.durable) {
        skippedNonDurable += 1;
        continue;
      }
      try {
        const result = await store[methodName](...args);
        activeIndex = index;
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`[runtime-store] ${store.name} backend failed during ${methodName}, falling back.`, error?.message || error);
      }
    }

    if (!config.allowNonDurableFallback && skippedNonDurable > 0) {
      throw lastError || new Error(
        `No durable runtime store available for ${methodName}. Configure KV_REST_API_URL + KV_REST_API_TOKEN or allow non-durable fallback.`
      );
    }

    throw lastError || new Error(`No runtime store available for ${methodName}`);
  }

  return {
    async checkRateLimit(ip) {
      return execute('checkRateLimit', ip);
    },
    async getCache(key) {
      return execute('getCache', key);
    },
    async setCache(key, data) {
      return execute('setCache', key, data);
    },
    getBackendName() {
      return stores[activeIndex]?.name || 'memory';
    },
    isDurable() {
      return Boolean(stores[activeIndex]?.durable);
    },
    hasDurableCandidate() {
      return hasDurableCandidate;
    },
    isDurabilityStrict() {
      return !config.allowNonDurableFallback;
    },
  };
}

module.exports = {
  createRuntimeStore,
};
