const crypto = require('crypto');
const {
  hasSupabaseAuthUsersConfig,
  insertSupabaseUser,
  updateSupabaseUser,
  deleteSupabaseUser,
} = require('../lib/server/supabase-auth-users');
const {
  MAX_BODY_BYTES,
  cleanString,
  setCorsHeaders,
  setSecurityHeaders,
} = require('../lib/server/config');
const {
  normalizeEmail,
  hashPassword,
  secureCompareHex,
  createToken,
  sanitizeUser,
  hydrateRuntimeUserCache,
  findUserByEmail,
  readAuthSession,
  sessionKey,
  emailKey,
  userKey,
  setAuthCookie,
  clearAuthCookie,
  sessionStore,
  userStore,
} = require('../lib/server/auth-session');
const { mergeLocalWardrobeIntoServer } = require('../lib/server/wardrobe-store');

const MAX_AUTH_BODY_BYTES = Math.min(MAX_BODY_BYTES, 24 * 1024);
const MAX_NAME_LEN = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LEN = 8;
const MAX_PASSWORD_LEN = 120;

function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function isInternalAuthCheck(req) {
  return cleanString(req.headers['x-kd-internal-auth-check']) === '1';
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

function validateRegisterInput(body) {
  const name = cleanString(body.name);
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!name || name.length > MAX_NAME_LEN) {
    return { error: `Isim gerekli ve en fazla ${MAX_NAME_LEN} karakter olmali` };
  }
  if (!email || !EMAIL_RE.test(email)) {
    return { error: 'Gecerli bir email gerekli' };
  }
  if (password.length < MIN_PASSWORD_LEN || password.length > MAX_PASSWORD_LEN) {
    return { error: `Sifre ${MIN_PASSWORD_LEN}-${MAX_PASSWORD_LEN} karakter olmali` };
  }

  return { name, email, password };
}

function validateLoginInput(body) {
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !EMAIL_RE.test(email)) {
    return { error: 'Gecerli bir email gerekli' };
  }
  if (!password) return { error: 'Sifre gerekli' };
  return { email, password };
}

function normalizeProfilePatch(body) {
  const allowedGenders = new Set(['', 'female', 'male', 'unisex']);
  const profile = body && typeof body === 'object' ? body : {};

  const displayName = cleanString(profile.displayName).slice(0, 60);
  const budgetBand = cleanString(profile.budgetBand).slice(0, 40);
  const city = cleanString(profile.city).slice(0, 40);
  const gender = cleanString(profile.gender).toLowerCase();
  const favoriteFamilies = Array.isArray(profile.favoriteFamilies)
    ? profile.favoriteFamilies
        .map((item) => cleanString(item).slice(0, 30))
        .filter(Boolean)
        .slice(0, 8)
    : [];

  return {
    displayName,
    budgetBand,
    city,
    gender: allowedGenders.has(gender) ? gender : '',
    favoriteFamilies,
  };
}

async function registerUser(body) {
  const parsed = validateRegisterInput(body);
  if (parsed.error) return { status: 400, error: parsed.error };

  const existing = await findUserByEmail(parsed.email);
  if (existing?.id) {
    return { status: 409, error: 'Bu email zaten kayitli' };
  }

  const userId = `usr_${crypto.randomBytes(12).toString('hex')}`;
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(parsed.password, salt);
  const nowIso = new Date().toISOString();

  const user = {
    id: userId,
    email: parsed.email,
    name: parsed.name,
    salt,
    passwordHash,
    createdAt: nowIso,
    updatedAt: nowIso,
    lastLoginAt: nowIso,
    profile: {
      displayName: parsed.name,
      budgetBand: '',
      city: '',
      gender: '',
      favoriteFamilies: [],
    },
  };

  if (hasSupabaseAuthUsersConfig()) {
    try {
      await insertSupabaseUser(user);
    } catch (error) {
      const message = cleanString(error?.message).toLowerCase();
      if (message.includes('duplicate key') || message.includes('unique') || message.includes('already exists')) {
        return { status: 409, error: 'Bu email zaten kayitli' };
      }
      console.warn('[auth] Supabase register failed, runtime fallback active.', error?.message || error);
    }
  }

  await hydrateRuntimeUserCache(user);

  const token = createToken();
  await sessionStore.setCache(sessionKey(token), {
    userId,
    active: true,
    createdAt: nowIso,
    lastSeenAt: nowIso,
  });

  return {
    status: 201,
    token,
    data: {
      user: sanitizeUser(user),
    },
  };
}

async function loginUser(body) {
  const parsed = validateLoginInput(body);
  if (parsed.error) return { status: 400, error: parsed.error };

  const user = await findUserByEmail(parsed.email);
  if (!user || !user.salt || !user.passwordHash) {
    return { status: 401, error: 'Email veya sifre hatali' };
  }

  const passwordHash = hashPassword(parsed.password, user.salt);
  if (!secureCompareHex(passwordHash, user.passwordHash)) {
    return { status: 401, error: 'Email veya sifre hatali' };
  }

  const nowIso = new Date().toISOString();
  user.lastLoginAt = nowIso;
  user.updatedAt = nowIso;
  if (hasSupabaseAuthUsersConfig()) {
    try {
      await updateSupabaseUser(user);
    } catch (error) {
      console.warn('[auth] Supabase login update failed, runtime cache preserved.', error?.message || error);
    }
  }
  await hydrateRuntimeUserCache(user);

  if (Array.isArray(body.localWardrobe) && body.localWardrobe.length > 0) {
    try {
      await mergeLocalWardrobeIntoServer(user.id, body.localWardrobe);
    } catch (error) {
      console.warn('[auth] localWardrobe merge skipped.', error?.message || error);
    }
  }

  const token = createToken();
  await sessionStore.setCache(sessionKey(token), {
    userId: user.id,
    active: true,
    createdAt: nowIso,
    lastSeenAt: nowIso,
  });

  return {
    status: 200,
    token,
    data: {
      user: sanitizeUser(user),
    },
  };
}

async function logoutUser(auth) {
  if (!auth) return { status: 200, data: { ok: true } };

  await sessionStore.setCache(sessionKey(auth.token), {
    userId: auth.user.id,
    active: false,
    revokedAt: new Date().toISOString(),
  });
  return { status: 200, data: { ok: true } };
}

async function changePassword(auth, body) {
  if (!auth) return { status: 401, error: 'Giris gerekli' };

  const oldPassword = typeof body.oldPassword === 'string' ? body.oldPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

  if (!oldPassword) return { status: 400, error: 'Mevcut sifre gerekli' };
  if (newPassword.length < MIN_PASSWORD_LEN || newPassword.length > MAX_PASSWORD_LEN) {
    return { status: 400, error: `Yeni sifre ${MIN_PASSWORD_LEN}-${MAX_PASSWORD_LEN} karakter olmali` };
  }

  const user = auth.user;
  if (!user.salt || !user.passwordHash) {
    return { status: 400, error: 'Bu hesap sifre tabanli degil' };
  }

  const oldHash = hashPassword(oldPassword, user.salt);
  if (!secureCompareHex(oldHash, user.passwordHash)) {
    return { status: 401, error: 'Mevcut sifre hatali' };
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  const newPasswordHash = hashPassword(newPassword, newSalt);
  const nowIso = new Date().toISOString();

  const updatedUser = { ...user, salt: newSalt, passwordHash: newPasswordHash, updatedAt: nowIso };

  if (hasSupabaseAuthUsersConfig()) {
    try {
      await updateSupabaseUser(updatedUser);
    } catch (error) {
      console.warn('[auth] Supabase password change failed.', error?.message || error);
    }
  }
  await hydrateRuntimeUserCache(updatedUser);

  // Revoke current session so user must re-login
  await sessionStore.setCache(sessionKey(auth.token), {
    userId: user.id,
    active: false,
    revokedAt: nowIso,
  });

  return { status: 200, data: { ok: true } };
}

async function deleteAccount(auth) {
  if (!auth) return { status: 401, error: 'Giris gerekli' };

  const userId = auth.user.id;
  const nowIso = new Date().toISOString();

  // Revoke session first
  await sessionStore.setCache(sessionKey(auth.token), {
    userId,
    active: false,
    revokedAt: nowIso,
  });

  // Remove from in-memory caches
  await userStore.setCache(userKey(userId), null);
  if (auth.user.email) {
    const emailKeyVal = emailKey(auth.user.email);
    await userStore.setCache(emailKeyVal, null);
  }

  // Delete from Supabase (cascades to wardrobe, analyses via FK)
  if (hasSupabaseAuthUsersConfig()) {
    try {
      await deleteSupabaseUser(userId);
    } catch (error) {
      console.warn('[auth] Supabase account deletion failed.', error?.message || error);
      return { status: 500, error: 'Hesap silinirken bir hata olustu. Lutfen tekrar deneyin.' };
    }
  }

  return { status: 200, data: { ok: true } };
}

async function forgotPassword(body) {
  const email = normalizeEmail(body.email);
  if (!email || !EMAIL_RE.test(email)) {
    return { status: 400, error: 'Gecerli bir email gerekli' };
  }

  // Always return success to prevent email enumeration
  // Email delivery requires SMTP configuration — see docs/email_setup.md
  // TODO: integrate with SMTP/Resend/Postmark when EMAIL_FROM env is set
  const emailFrom = cleanString(process.env.EMAIL_FROM);
  if (!emailFrom) {
    // Graceful degradation: notify without leaking whether email exists
    return { status: 200, data: { ok: true } };
  }

  // If email service is configured, we'd send a reset link here
  // For now we confirm success without actually sending
  return { status: 200, data: { ok: true } };
}

async function patchProfile(auth, body) {
  if (!auth) return { status: 401, error: 'Giris gerekli' };
  const patch = normalizeProfilePatch(body?.profile || {});

  const user = { ...auth.user };
  user.profile = { ...(user.profile || {}), ...patch };
  user.updatedAt = new Date().toISOString();
  if (hasSupabaseAuthUsersConfig()) {
    try {
      await updateSupabaseUser(user);
    } catch (error) {
      console.warn('[auth] Supabase profile patch failed, runtime cache preserved.', error?.message || error);
    }
  }
  await hydrateRuntimeUserCache(user);

  return {
    status: 200,
    data: {
      user: sanitizeUser(user),
    },
  };
}

async function handler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res)) {
    return res.status(403).json({ error: 'Bu origin icin erisim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST', 'PATCH'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIP(req);
  if (!isInternalAuthCheck(req)) {
    const rate = await sessionStore.checkRateLimit(`auth:${ip}`);
    if (!rate.allowed) {
      const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({ error: 'Cok fazla auth istegi', retryAfter });
    }
  }

  if (req.method === 'GET') {
    const auth = await readAuthSession(req);
    if (!auth) return res.status(401).json({ error: 'Giris gerekli' });
    return res.status(200).json({ user: sanitizeUser(auth.user) });
  }

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Gecersiz JSON govdesi' });
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_AUTH_BODY_BYTES) {
    return res.status(413).json({ error: 'Istek cok buyuk' });
  }

  if (req.method === 'PATCH') {
    const auth = await readAuthSession(req);
    const result = await patchProfile(auth, body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.status(result.status).json(result.data);
  }

  const action = cleanString(body.action).toLowerCase();
  if (!action) return res.status(400).json({ error: 'action gerekli' });

  if (action === 'register') {
    const result = await registerUser(body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    setAuthCookie(res, result.token, 2592000);
    return res.status(result.status).json(result.data);
  }

  if (action === 'login') {
    const result = await loginUser(body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    setAuthCookie(res, result.token, 2592000);
    return res.status(result.status).json(result.data);
  }

  if (action === 'logout') {
    const auth = await readAuthSession(req);
    const result = await logoutUser(auth);
    clearAuthCookie(res);
    return res.status(result.status).json(result.data);
  }

  if (action === 'change-password') {
    const auth = await readAuthSession(req);
    const result = await changePassword(auth, body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    clearAuthCookie(res);
    return res.status(result.status).json(result.data);
  }

  if (action === 'delete-account') {
    const auth = await readAuthSession(req);
    const result = await deleteAccount(auth);
    if (result.error) return res.status(result.status).json({ error: result.error });
    clearAuthCookie(res);
    return res.status(result.status).json(result.data);
  }

  if (action === 'forgot-password') {
    const result = await forgotPassword(body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.status(result.status).json(result.data);
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
