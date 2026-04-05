const { createRuntimeStore } = require('./runtime-store');
const {
  cleanString,
  parseBoolean,
  resolveSupabaseConfig,
  hasSupabaseServiceConfig,
  shouldRequireSupabaseWardrobe,
} = require('./supabase-config');

const WARDROBE_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const WARDROBE_RATE_LIMIT_MAX = 40;
const WARDROBE_TTL_MS = 540 * 24 * 60 * 60 * 1000;
const MAX_ITEMS = 600;
const MAX_TAGS = 8;

const wardrobeStore = createRuntimeStore({
  rateLimitWindowMs: WARDROBE_RATE_LIMIT_WINDOW_MS,
  rateLimitMax: WARDROBE_RATE_LIMIT_MAX,
  cacheTtlMs: WARDROBE_TTL_MS,
  cacheMaxEntries: 40000,
  keyPrefix: 'koku-wardrobe',
});

function wardrobeKey(userId) {
  return `wardrobe:user:${cleanString(userId)}`;
}

function cleanDateIso(value) {
  const raw = cleanString(value);
  if (!raw) return new Date().toISOString();
  const time = Date.parse(raw);
  return Number.isFinite(time) ? new Date(time).toISOString() : new Date().toISOString();
}

function sanitizeTagList(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  const seen = new Set();
  for (const item of value) {
    const tag = cleanString(item).toLowerCase().slice(0, 24);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

function sanitizeShelfItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = cleanString(raw.name).slice(0, 140);
  if (!name) return null;

  const statusRaw = cleanString(raw.status).toLowerCase();
  const status = ['wishlist', 'owned', 'tested', 'rebuy', 'skip'].includes(statusRaw)
    ? statusRaw
    : 'wishlist';

  const iconToken =
    cleanString(raw.iconToken || raw.emoji)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '')
      .slice(0, 24) || 'signature';

  return {
    key: cleanString(raw.key).toLowerCase().slice(0, 160) || name.toLowerCase().replace(/\s+/g, '-'),
    name,
    brand: cleanString(raw.brand).slice(0, 120),
    iconToken,
    emoji: iconToken,
    family: cleanString(raw.family).slice(0, 64),
    status,
    favorite: raw.favorite === true,
    rating: Math.max(0, Math.min(5, Math.round(Number(raw.rating) || 0))),
    notes: cleanString(raw.notes).slice(0, 320),
    tags: sanitizeTagList(raw.tags),
    updatedAt: cleanDateIso(raw.updatedAt),
    analysis: raw.analysis && typeof raw.analysis === 'object' ? raw.analysis : null,
  };
}

function sanitizeShelfState(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const normalized = {};
  let count = 0;

  for (const [key, value] of Object.entries(source)) {
    if (count >= MAX_ITEMS) break;
    const cleanKey = cleanString(key).toLowerCase().slice(0, 160);
    if (!cleanKey) continue;
    const item = sanitizeShelfItem({ ...value, key: cleanKey });
    if (!item) continue;
    normalized[cleanKey] = item;
    count += 1;
  }

  return normalized;
}

function normalizeWardrobeItems(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => sanitizeShelfItem(row))
    .filter(Boolean)
    .slice(0, MAX_ITEMS);
}

function rowsToShelf(rows) {
  return normalizeWardrobeItems(rows).reduce((acc, row) => {
    acc[row.key] = row;
    return acc;
  }, {});
}

function shelfToRows(shelf) {
  return Object.values(sanitizeShelfState(shelf)).sort(
    (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
  );
}

function getSupabaseConfig() {
  const cfg = resolveSupabaseConfig();
  return {
    url: cfg.url,
    key: cfg.serviceRoleKey,
    table: cfg.wardrobeTable,
    sources: cfg.sources,
  };
}

function hasSupabaseConfig() {
  return hasSupabaseServiceConfig();
}

function allowRuntimeFallback() {
  if (shouldRequireSupabaseWardrobe()) return false;
  if (cleanString(process.env.WARDROBE_ALLOW_RUNTIME_FALLBACK)) {
    return parseBoolean(process.env.WARDROBE_ALLOW_RUNTIME_FALLBACK, false);
  }
  return true;
}

function buildStorageDiagnostics() {
  const cfg = getSupabaseConfig();
  return {
    mode: hasSupabaseConfig() ? 'supabase' : 'runtime-store',
    required: shouldRequireSupabaseWardrobe(),
    runtimeFallbackAllowed: allowRuntimeFallback(),
    supabaseConfigured: hasSupabaseConfig(),
    supabaseSources: cfg.sources,
  };
}

async function fetchSupabaseRow(userId) {
  const cfg = getSupabaseConfig();
  const selectUrl = `${cfg.url}/rest/v1/${encodeURIComponent(cfg.table)}?user_id=eq.${encodeURIComponent(
    userId,
  )}&select=user_id,shelf_json,updated_at&limit=1`;
  const response = await fetch(selectUrl, {
    method: 'GET',
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `Supabase read failed (${response.status})`);
  }

  const rows = await response.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  return row && typeof row === 'object' ? row : null;
}

async function upsertSupabaseRow(userId, shelf, updatedAtIso) {
  const cfg = getSupabaseConfig();
  const upsertUrl = `${cfg.url}/rest/v1/${encodeURIComponent(cfg.table)}?on_conflict=user_id`;
  const payload = {
    user_id: userId,
    shelf_json: shelf,
    updated_at: updatedAtIso,
  };
  const response = await fetch(upsertUrl, {
    method: 'POST',
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `Supabase upsert failed (${response.status})`);
  }

  return response.json().catch(() => []);
}

async function readWardrobe(userId) {
  if (hasSupabaseConfig()) {
    try {
      const row = await fetchSupabaseRow(userId);
      return {
        source: 'supabase',
        shelf: sanitizeShelfState(row?.shelf_json || {}),
        updatedAt: cleanDateIso(row?.updated_at),
      };
    } catch (error) {
      if (!allowRuntimeFallback()) {
        throw new Error(`Supabase read failed and runtime fallback disabled: ${error?.message || error}`);
      }
      console.warn('[wardrobe-store] Supabase read failed, fallback to runtime store.', error?.message || error);
    }
  } else if (!allowRuntimeFallback()) {
    throw new Error('Supabase wardrobe config missing and runtime fallback disabled.');
  }

  const fallback = await wardrobeStore.getCache(wardrobeKey(userId));
  return {
    source: 'runtime-store',
    shelf: sanitizeShelfState(fallback?.shelf || {}),
    updatedAt: cleanDateIso(fallback?.updatedAt),
  };
}

async function writeWardrobe(userId, shelf) {
  const updatedAt = new Date().toISOString();
  const sanitized = sanitizeShelfState(shelf);

  if (hasSupabaseConfig()) {
    try {
      await upsertSupabaseRow(userId, sanitized, updatedAt);
      return {
        source: 'supabase',
        shelf: sanitized,
        updatedAt,
      };
    } catch (error) {
      if (!allowRuntimeFallback()) {
        throw new Error(`Supabase upsert failed and runtime fallback disabled: ${error?.message || error}`);
      }
      console.warn('[wardrobe-store] Supabase upsert failed, fallback to runtime store.', error?.message || error);
    }
  } else if (!allowRuntimeFallback()) {
    throw new Error('Supabase wardrobe config missing and runtime fallback disabled.');
  }

  await wardrobeStore.setCache(wardrobeKey(userId), {
    shelf: sanitized,
    updatedAt,
  });
  return {
    source: 'runtime-store',
    shelf: sanitized,
    updatedAt,
  };
}

async function mergeLocalWardrobeIntoServer(userId, localWardrobe) {
  const serverState = await readWardrobe(userId);
  const serverShelf = sanitizeShelfState(serverState.shelf);
  const localShelf = rowsToShelf(localWardrobe);

  for (const [key, value] of Object.entries(localShelf)) {
    if (!serverShelf[key]) {
      serverShelf[key] = value;
    }
  }

  return writeWardrobe(userId, serverShelf);
}

module.exports = {
  wardrobeStore,
  sanitizeShelfState,
  normalizeWardrobeItems,
  rowsToShelf,
  shelfToRows,
  readWardrobe,
  writeWardrobe,
  mergeLocalWardrobeIntoServer,
  buildStorageDiagnostics,
};
