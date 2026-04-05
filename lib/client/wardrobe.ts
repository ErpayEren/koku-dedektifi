import { fetchWardrobe } from '@/lib/api';
import { getWardrobe, setWardrobe } from './storage';
import type { AnalysisResult, WardrobeItem } from './types';

interface WardrobeResponse {
  shelf?: Record<string, Omit<WardrobeItem, 'key'>>;
}

export function normalizeWardrobeItem(raw: Partial<WardrobeItem> & { key?: string; name?: string }): WardrobeItem | null {
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const key = typeof raw.key === 'string' ? raw.key.trim().toLowerCase() : name.toLowerCase().replace(/\s+/g, '-');
  if (!name || !key) return null;

  const ratingValue = Number(raw.rating);

  return {
    key,
    name,
    brand: typeof raw.brand === 'string' ? raw.brand.trim() : '',
    family: typeof raw.family === 'string' ? raw.family.trim() : '',
    status:
      raw.status === 'owned' || raw.status === 'wishlist' || raw.status === 'tested' || raw.status === 'rebuy' || raw.status === 'skip'
        ? raw.status
        : 'wishlist',
    favorite: raw.favorite === true,
    rating: Number.isFinite(ratingValue) ? Math.max(0, Math.min(5, Math.round(ratingValue))) : 0,
    notes: typeof raw.notes === 'string' ? raw.notes.trim() : '',
    iconToken: typeof raw.iconToken === 'string' ? raw.iconToken.trim() : '',
    tags: Array.isArray(raw.tags)
      ? raw.tags
          .map((item) => (typeof item === 'string' ? item.trim().toLowerCase() : ''))
          .filter(Boolean)
          .slice(0, 8)
      : [],
    updatedAt: typeof raw.updatedAt === 'string' && raw.updatedAt.trim() ? raw.updatedAt : new Date().toISOString(),
    analysis: raw.analysis && typeof raw.analysis === 'object' ? (raw.analysis as AnalysisResult) : null,
  };
}

export function normalizeWardrobeRows(rows: WardrobeItem[]): WardrobeItem[] {
  return rows
    .map((row) => normalizeWardrobeItem(row))
    .filter((row): row is WardrobeItem => Boolean(row))
    .sort((left, right) => Date.parse(right.updatedAt || '') - Date.parse(left.updatedAt || ''));
}

export function mergeWardrobeRows(localRows: WardrobeItem[], serverRows: WardrobeItem[]): WardrobeItem[] {
  const merged = new Map<string, WardrobeItem>();

  for (const row of normalizeWardrobeRows(localRows)) {
    merged.set(row.key, row);
  }

  for (const row of normalizeWardrobeRows(serverRows)) {
    const existing = merged.get(row.key);
    if (!existing) {
      merged.set(row.key, row);
      continue;
    }

    const existingTime = Date.parse(existing.updatedAt || '');
    const nextTime = Date.parse(row.updatedAt || '');
    if (!Number.isFinite(existingTime) || (Number.isFinite(nextTime) && nextTime >= existingTime)) {
      merged.set(row.key, row);
    }
  }

  return Array.from(merged.values()).sort((left, right) => Date.parse(right.updatedAt || '') - Date.parse(left.updatedAt || ''));
}

function rowsToShelf(rows: WardrobeItem[]): Record<string, Omit<WardrobeItem, 'key'>> {
  return normalizeWardrobeRows(rows).reduce<Record<string, Omit<WardrobeItem, 'key'>>>((acc, row) => {
    const { key, ...rest } = row;
    acc[key] = rest;
    return acc;
  }, {});
}

export async function syncWardrobeFromRemote(): Promise<WardrobeItem[]> {
  try {
    const response = await fetchWardrobe<WardrobeResponse>('GET');
    const serverRows = Object.entries(response?.shelf || {}).map(([key, value]) => normalizeWardrobeItem({ key, ...value })).filter(
      (row): row is WardrobeItem => Boolean(row),
    );
    const merged = mergeWardrobeRows(getWardrobe(), serverRows);
    setWardrobe(merged);
    return merged;
  } catch {
    return normalizeWardrobeRows(getWardrobe());
  }
}

export async function pushWardrobeToRemote(rows: WardrobeItem[]): Promise<WardrobeItem[]> {
  const normalized = normalizeWardrobeRows(rows);
  setWardrobe(normalized);

  try {
    await fetchWardrobe('PUT', {
      shelf: rowsToShelf(normalized),
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // local-first fallback
  }

  return normalized;
}

export async function upsertWardrobeRemote(item: WardrobeItem): Promise<WardrobeItem[]> {
  const merged = mergeWardrobeRows(getWardrobe(), [item]);
  return pushWardrobeToRemote(merged);
}
