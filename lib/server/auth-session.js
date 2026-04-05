const crypto = require('crypto');
const { createRuntimeStore } = require('./runtime-store');
const {
  hasSupabaseAuthUsersConfig,
  fetchSupabaseUserByEmail,
  fetchSupabaseUserById,
} = require('./supabase-auth-users');

const AUTH_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const AUTH_RATE_LIMIT_MAX = 20;
const USER_TTL_MS = 365 * 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const userStore = createRuntimeStore({
  cacheTtlMs: USER_TTL_MS,
  cacheMaxEntries: 30000,
  keyPrefix: 'koku-auth-user',
});

const sessionStore = createRuntimeStore({
  rateLimitWindowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  rateLimitMax: AUTH_RATE_LIMIT_MAX,
  cacheTtlMs: SESSION_TTL_MS,
  cacheMaxEntries: 50000,
  keyPrefix: 'koku-auth-session',
});

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(email) {
  return cleanString(email).toLowerCase();
}

function hashSha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function emailKey(email) {
  return `email:${hashSha256(normalizeEmail(email))}`;
}

function userKey(userId) {
  return `user:${cleanString(userId)}`;
}

function sessionKey(token) {
  return `session:${hashSha256(token)}`;
}

function parseCookieHeader(rawHeader) {
  const raw = cleanString(rawHeader);
  if (!raw) return {};

  return raw.split(';').reduce((acc, chunk) => {
    const idx = chunk.indexOf('=');
    if (idx <= 0) return acc;
    const key = chunk.slice(0, idx).trim();
    const value = chunk.slice(idx + 1).trim();
    if (!key) return acc;
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function getHeaderValue(req, headerName) {
  const lower = cleanString(headerName).toLowerCase();
  if (!lower || !req?.headers || typeof req.headers !== 'object') return '';
  for (const [key, value] of Object.entries(req.headers)) {
    if (String(key).toLowerCase() !== lower) continue;
    if (Array.isArray(value)) return cleanString(value[0]);
    return cleanString(value);
  }
  return '';
}

function getAuthTokenFromRequest(req) {
  const cookies = parseCookieHeader(getHeaderValue(req, 'cookie'));
  const cookieToken = cleanString(cookies.kd_token);
  if (cookieToken) return cookieToken;

  const authHeader = getHeaderValue(req, 'authorization');
  if (authHeader.startsWith('Bearer ')) {
    return cleanString(authHeader.slice(7));
  }

  return '';
}

function appendHeader(res, key, value) {
  const existing = typeof res.getHeader === 'function' ? res.getHeader(key) : res.headers?.[key];
  if (!existing) {
    res.setHeader(key, value);
    return;
  }
  if (Array.isArray(existing)) {
    res.setHeader(key, [...existing, value]);
    return;
  }
  res.setHeader(key, [existing, value]);
}

function buildCookie(token, maxAgeSeconds) {
  return [
    `kd_token=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ].join('; ');
}

function setAuthCookie(res, token, maxAgeSeconds = 30 * 24 * 60 * 60) {
  appendHeader(res, 'Set-Cookie', buildCookie(token, maxAgeSeconds));
}

function clearAuthCookie(res) {
  appendHeader(
    res,
    'Set-Cookie',
    ['kd_token=', 'Path=/', 'Max-Age=0', 'HttpOnly', 'Secure', 'SameSite=Strict'].join('; '),
  );
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
}

function secureCompareHex(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  if (left.length !== right.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
  } catch {
    return false;
  }
}

function createToken() {
  return crypto.randomBytes(32).toString('hex');
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isPro: Boolean(user.isPro || user.profile?.isPro),
    proActivatedAt: user.proActivatedAt || user.profile?.proActivatedAt || null,
    profile: user.profile || {},
    createdAt: user.createdAt,
    updatedAt: user.updatedAt || null,
    lastLoginAt: user.lastLoginAt || null,
  };
}

async function hydrateRuntimeUserCache(user) {
  if (!user?.id || !user?.email) return;
  await userStore.setCache(userKey(user.id), user);
  await userStore.setCache(emailKey(user.email), user.id);
}

async function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  if (hasSupabaseAuthUsersConfig()) {
    try {
      const supabaseUser = await fetchSupabaseUserByEmail(normalizedEmail);
      if (supabaseUser) {
        await hydrateRuntimeUserCache(supabaseUser);
        return supabaseUser;
      }
    } catch (error) {
      console.warn('[auth-session] Supabase email lookup failed.', error?.message || error);
    }
  }

  const existingUserId = await userStore.getCache(emailKey(normalizedEmail));
  if (!existingUserId) return null;
  return userStore.getCache(userKey(existingUserId));
}

async function findUserById(userId) {
  const normalizedId = cleanString(userId);
  if (!normalizedId) return null;

  const cached = await userStore.getCache(userKey(normalizedId));
  if (cached) return cached;

  if (!hasSupabaseAuthUsersConfig()) return null;
  try {
    const supabaseUser = await fetchSupabaseUserById(normalizedId);
    if (supabaseUser) {
      await hydrateRuntimeUserCache(supabaseUser);
      return supabaseUser;
    }
  } catch (error) {
    console.warn('[auth-session] Supabase id lookup failed.', error?.message || error);
  }

  return null;
}

async function readAuthSession(req) {
  const token = getAuthTokenFromRequest(req);
  if (!token) return null;

  const session = await sessionStore.getCache(sessionKey(token));
  if (!session || session.active !== true || !session.userId) return null;

  const user = await findUserById(session.userId);
  if (!user) return null;

  return { token, session, user };
}

module.exports = {
  cleanString,
  normalizeEmail,
  hashSha256,
  emailKey,
  userKey,
  sessionKey,
  parseCookieHeader,
  getAuthTokenFromRequest,
  setAuthCookie,
  clearAuthCookie,
  hashPassword,
  secureCompareHex,
  createToken,
  sanitizeUser,
  hydrateRuntimeUserCache,
  findUserByEmail,
  findUserById,
  readAuthSession,
  userStore,
  sessionStore,
};
