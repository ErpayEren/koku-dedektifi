function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toUrlBase(raw) {
  const cleaned = cleanString(raw).replace(/\/+$/, '');
  if (!cleaned) return '';
  return /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
}

function parseBoolean(value, fallback = false) {
  const cleaned = cleanString(String(value ?? '')).toLowerCase();
  if (!cleaned) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(cleaned)) return true;
  if (['0', 'false', 'no', 'off'].includes(cleaned)) return false;
  return fallback;
}

function pickEnv(keys) {
  for (const key of keys) {
    const value = cleanString(process.env[key]);
    if (value) return { key, value };
  }
  return { key: '', value: '' };
}

const SUPABASE_URL_KEYS = [
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'PUBLIC_SUPABASE_URL',
  'VITE_SUPABASE_URL',
];

const SUPABASE_SERVICE_ROLE_KEYS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_SECRET_KEY',
];

const SUPABASE_USERS_TABLE_KEYS = [
  'SUPABASE_USERS_TABLE',
];

const SUPABASE_WARDROBE_TABLE_KEYS = [
  'SUPABASE_WARDROBE_TABLE',
];

const SUPABASE_VECTOR_RPC_KEYS = [
  'SUPABASE_VECTOR_RPC',
];

function resolveSupabaseConfig() {
  const urlEntry = pickEnv(SUPABASE_URL_KEYS);
  const serviceKeyEntry = pickEnv(SUPABASE_SERVICE_ROLE_KEYS);
  const usersTableEntry = pickEnv(SUPABASE_USERS_TABLE_KEYS);
  const wardrobeTableEntry = pickEnv(SUPABASE_WARDROBE_TABLE_KEYS);
  const vectorRpcEntry = pickEnv(SUPABASE_VECTOR_RPC_KEYS);

  const url = toUrlBase(urlEntry.value);
  const serviceRoleKey = cleanString(serviceKeyEntry.value);

  return {
    url,
    serviceRoleKey,
    usersTable: cleanString(usersTableEntry.value) || 'app_users',
    wardrobeTable: cleanString(wardrobeTableEntry.value) || 'scent_wardrobe',
    vectorRpc: cleanString(vectorRpcEntry.value) || 'match_perfume_docs',
    sources: {
      url: urlEntry.key,
      serviceRoleKey: serviceKeyEntry.key,
      usersTable: usersTableEntry.key,
      wardrobeTable: wardrobeTableEntry.key,
      vectorRpc: vectorRpcEntry.key,
    },
  };
}

function hasSupabaseServiceConfig() {
  const cfg = resolveSupabaseConfig();
  return Boolean(cfg.url && cfg.serviceRoleKey);
}

function isProductionLike() {
  const env = cleanString(process.env.VERCEL_ENV || process.env.NODE_ENV).toLowerCase();
  return env === 'production';
}

function shouldRequireSupabaseWardrobe() {
  if (cleanString(process.env.WARDROBE_REQUIRE_SUPABASE)) {
    return parseBoolean(process.env.WARDROBE_REQUIRE_SUPABASE, false);
  }
  const runningOnVercel = parseBoolean(process.env.VERCEL, false) || Boolean(cleanString(process.env.VERCEL_URL));
  if (runningOnVercel) return true;
  return isProductionLike();
}

module.exports = {
  cleanString,
  parseBoolean,
  toUrlBase,
  resolveSupabaseConfig,
  hasSupabaseServiceConfig,
  isProductionLike,
  shouldRequireSupabaseWardrobe,
};
