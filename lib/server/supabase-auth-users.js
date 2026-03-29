const {
  cleanString,
  resolveSupabaseConfig,
  hasSupabaseServiceConfig,
} = require('./supabase-config');

function hasSupabaseAuthUsersConfig() {
  return hasSupabaseServiceConfig();
}

function getSupabaseAuthConfig() {
  const supabase = resolveSupabaseConfig();
  return {
    url: supabase.url,
    key: supabase.serviceRoleKey,
    usersTable: supabase.usersTable,
    sources: supabase.sources,
  };
}

function userToSupabaseRow(user) {
  const src = user && typeof user === 'object' ? user : {};
  return {
    id: cleanString(src.id),
    email: cleanString(src.email).toLowerCase(),
    name: cleanString(src.name),
    salt: cleanString(src.salt),
    password_hash: cleanString(src.passwordHash),
    profile_json: src.profile && typeof src.profile === 'object' ? src.profile : {},
    created_at: cleanString(src.createdAt),
    updated_at: cleanString(src.updatedAt),
    last_login_at: cleanString(src.lastLoginAt),
  };
}

function supabaseRowToUser(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    id: cleanString(row.id),
    email: cleanString(row.email).toLowerCase(),
    name: cleanString(row.name),
    salt: cleanString(row.salt),
    passwordHash: cleanString(row.password_hash),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at),
    lastLoginAt: cleanString(row.last_login_at),
    profile: row.profile_json && typeof row.profile_json === 'object'
      ? row.profile_json
      : {},
  };
}

async function fetchSupabaseUsersByFilter(filterQuery) {
  const cfg = getSupabaseAuthConfig();
  if (!cfg.url || !cfg.key) return [];

  const select = [
    'id',
    'email',
    'name',
    'salt',
    'password_hash',
    'profile_json',
    'created_at',
    'updated_at',
    'last_login_at',
  ].join(',');

  const url = `${cfg.url}/rest/v1/${encodeURIComponent(cfg.usersTable)}?${filterQuery}&select=${encodeURIComponent(select)}&limit=1`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || `Supabase user read failed (${response.status})`);
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

async function fetchSupabaseUserByEmail(email) {
  const normalized = cleanString(email).toLowerCase();
  if (!normalized) return null;
  const rows = await fetchSupabaseUsersByFilter(`email=eq.${encodeURIComponent(normalized)}`);
  return supabaseRowToUser(rows[0]);
}

async function fetchSupabaseUserById(userId) {
  const normalized = cleanString(userId);
  if (!normalized) return null;
  const rows = await fetchSupabaseUsersByFilter(`id=eq.${encodeURIComponent(normalized)}`);
  return supabaseRowToUser(rows[0]);
}

async function insertSupabaseUser(user) {
  const cfg = getSupabaseAuthConfig();
  if (!cfg.url || !cfg.key) return;
  const row = userToSupabaseRow(user);

  const response = await fetch(`${cfg.url}/rest/v1/${encodeURIComponent(cfg.usersTable)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify([row]),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || `Supabase user insert failed (${response.status})`);
  }
}

async function updateSupabaseUser(user) {
  const cfg = getSupabaseAuthConfig();
  if (!cfg.url || !cfg.key) return;
  const row = userToSupabaseRow(user);
  if (!row.id) throw new Error('Supabase update icin user id gerekli');

  const response = await fetch(
    `${cfg.url}/rest/v1/${encodeURIComponent(cfg.usersTable)}?id=eq.${encodeURIComponent(row.id)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        name: row.name,
        profile_json: row.profile_json,
        updated_at: row.updated_at,
        last_login_at: row.last_login_at,
      }),
    },
  );
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || `Supabase user update failed (${response.status})`);
  }
}

module.exports = {
  hasSupabaseAuthUsersConfig,
  fetchSupabaseUserByEmail,
  fetchSupabaseUserById,
  insertSupabaseUser,
  updateSupabaseUser,
  supabaseRowToUser,
  userToSupabaseRow,
};
