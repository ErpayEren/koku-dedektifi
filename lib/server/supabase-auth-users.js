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
  const profile = src.profile && typeof src.profile === 'object' ? src.profile : {};
  const isPro = typeof src.isPro === 'boolean' ? src.isPro : Boolean(profile.isPro);
  const proActivatedAt = cleanString(src.proActivatedAt || profile.proActivatedAt);
  return {
    id: cleanString(src.id),
    email: cleanString(src.email).toLowerCase(),
    name: cleanString(src.name),
    salt: cleanString(src.salt),
    password_hash: cleanString(src.passwordHash),
    profile_json: {
      ...profile,
      isPro,
      proActivatedAt: proActivatedAt || null,
    },
    created_at: cleanString(src.createdAt),
    updated_at: cleanString(src.updatedAt),
    last_login_at: cleanString(src.lastLoginAt),
    is_pro: isPro,
    pro_activated_at: proActivatedAt,
  };
}

function supabaseRowToUser(row) {
  if (!row || typeof row !== 'object') return null;
  const profile = row.profile_json && typeof row.profile_json === 'object'
    ? row.profile_json
    : {};
  const isPro = typeof row.is_pro === 'boolean'
    ? row.is_pro
    : Boolean(profile.isPro);
  const proActivatedAt = cleanString(row.pro_activated_at || profile.proActivatedAt);
  return {
    id: cleanString(row.id),
    email: cleanString(row.email).toLowerCase(),
    name: cleanString(row.name),
    salt: cleanString(row.salt),
    passwordHash: cleanString(row.password_hash),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at),
    lastLoginAt: cleanString(row.last_login_at),
    isPro,
    proActivatedAt: proActivatedAt || null,
    profile,
  };
}

async function syncOperationalUserRow(row) {
  const cfg = getSupabaseAuthConfig();
  if (!cfg.url || !cfg.key || !row?.id) return;

  try {
    await fetch(`${cfg.url}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([
        {
          id: row.id,
          email: row.email || null,
          is_pro: Boolean(row.is_pro),
          pro_activated_at: row.pro_activated_at || null,
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at || new Date().toISOString(),
        },
      ]),
    });
  } catch {
    // Operational mirror sync should not block auth/profile writes.
  }
}

async function fetchSupabaseUsersByFilter(filterQuery) {
  const cfg = getSupabaseAuthConfig();
  if (!cfg.url || !cfg.key) return [];

  const url = `${cfg.url}/rest/v1/${encodeURIComponent(cfg.usersTable)}?${filterQuery}&select=*&limit=1`;
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
  const legacyRow = {
    ...row,
  };
  delete legacyRow.is_pro;
  delete legacyRow.pro_activated_at;

  const payloads = [[row], [legacyRow]];
  let lastError = null;

  for (const payload of payloads) {
    const response = await fetch(`${cfg.url}/rest/v1/${encodeURIComponent(cfg.usersTable)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      await syncOperationalUserRow(row);
      return;
    }
    lastError = await response.text().catch(() => '');
    const lowered = cleanString(lastError).toLowerCase();
    if (!lowered.includes('is_pro') && !lowered.includes('pro_activated_at')) {
      break;
    }
  }

  throw new Error(lastError || 'Supabase user insert failed');
}

async function updateSupabaseUser(user) {
  const cfg = getSupabaseAuthConfig();
  if (!cfg.url || !cfg.key) return;
  const row = userToSupabaseRow(user);
  if (!row.id) throw new Error('Supabase update icin user id gerekli');

  const payloads = [
    {
      name: row.name,
      profile_json: row.profile_json,
      updated_at: row.updated_at,
      last_login_at: row.last_login_at,
      is_pro: row.is_pro,
      pro_activated_at: row.pro_activated_at || null,
    },
    {
      name: row.name,
      profile_json: row.profile_json,
      updated_at: row.updated_at,
      last_login_at: row.last_login_at,
    },
  ];

  let lastError = null;
  for (const payload of payloads) {
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
        body: JSON.stringify(payload),
      },
    );

    if (response.ok) {
      await syncOperationalUserRow(row);
      return;
    }
    lastError = await response.text().catch(() => '');
    const lowered = cleanString(lastError).toLowerCase();
    if (!lowered.includes('is_pro') && !lowered.includes('pro_activated_at')) {
      break;
    }
  }

  throw new Error(lastError || 'Supabase user update failed');
}

async function deleteSupabaseUser(userId) {
  const cfg = getSupabaseAuthConfig();
  if (!cfg.url || !cfg.key || !userId) return;

  await fetch(
    `${cfg.url}/rest/v1/${encodeURIComponent(cfg.usersTable)}?id=eq.${encodeURIComponent(userId)}`,
    {
      method: 'DELETE',
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        Prefer: 'return=minimal',
      },
    },
  );

  // Mirror delete on operational users table
  await fetch(
    `${cfg.url}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`,
    {
      method: 'DELETE',
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        Prefer: 'return=minimal',
      },
    },
  ).catch(() => {});
}

module.exports = {
  hasSupabaseAuthUsersConfig,
  fetchSupabaseUserByEmail,
  fetchSupabaseUserById,
  insertSupabaseUser,
  syncOperationalUserRow,
  updateSupabaseUser,
  deleteSupabaseUser,
  supabaseRowToUser,
  userToSupabaseRow,
};
