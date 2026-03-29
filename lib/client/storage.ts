import type { AnalysisResult, FeedItem, WardrobeItem } from './types';

const KEYS = {
  history: 'kd:history:v2',
  wardrobe: 'kd:wardrobe:v2',
  feed: 'kd:feed:v2',
  authToken: 'kd:auth:token',
} as const;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getHistory(): AnalysisResult[] {
  const rows = readJson<AnalysisResult[]>(KEYS.history, []);
  return Array.isArray(rows) ? rows : [];
}

export function saveHistoryRow(row: AnalysisResult): void {
  const list = getHistory().filter((item) => item.id !== row.id);
  list.unshift(row);
  writeJson(KEYS.history, list.slice(0, 40));
}

export function clearHistory(): void {
  writeJson(KEYS.history, []);
}

export function findHistoryById(id: string): AnalysisResult | null {
  if (!id) return null;
  const row = getHistory().find((item) => item.id === id);
  return row || null;
}

export function getWardrobe(): WardrobeItem[] {
  const rows = readJson<WardrobeItem[]>(KEYS.wardrobe, []);
  return Array.isArray(rows) ? rows : [];
}

export function upsertWardrobe(item: WardrobeItem): void {
  const list = getWardrobe().filter((row) => row.key !== item.key);
  list.unshift(item);
  writeJson(KEYS.wardrobe, list.slice(0, 300));
}

export function removeWardrobe(key: string): void {
  const list = getWardrobe().filter((item) => item.key !== key);
  writeJson(KEYS.wardrobe, list);
}

export function setWardrobe(rows: WardrobeItem[]): void {
  writeJson(KEYS.wardrobe, rows.slice(0, 300));
}

export function getFeed(): FeedItem[] {
  const rows = readJson<FeedItem[]>(KEYS.feed, []);
  return Array.isArray(rows) ? rows : [];
}

export function pushFeed(event: Omit<FeedItem, 'id' | 'ts'>): void {
  const rows = getFeed();
  const item: FeedItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
    ...event,
  };
  rows.unshift(item);
  writeJson(KEYS.feed, rows.slice(0, 120));
}

export function clearFeed(): void {
  writeJson(KEYS.feed, []);
}

export function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(KEYS.authToken) || '';
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  if (!token) {
    window.localStorage.removeItem(KEYS.authToken);
    return;
  }
  window.localStorage.setItem(KEYS.authToken, token);
}
