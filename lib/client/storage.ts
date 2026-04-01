import type { AnalysisResult, FeedItem, OnboardingPreferences, WardrobeItem } from './types';

const KEYS = {
  history: 'kd:history:v2',
  wardrobe: 'kd:wardrobe:v2',
  feed: 'kd:feed:v2',
  onboarding: 'kd:onboarding:v1',
} as const;

const pendingWrites = new Map<string, number>();

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

export function debouncedWrite<T>(key: string, value: T, ms = 400): void {
  if (typeof window === 'undefined') return;
  const existing = pendingWrites.get(key);
  if (existing) {
    window.clearTimeout(existing);
  }
  const timer = window.setTimeout(() => {
    writeJson(key, value);
    pendingWrites.delete(key);
  }, ms);
  pendingWrites.set(key, timer);
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
  debouncedWrite(KEYS.wardrobe, list.slice(0, 300));
}

export function removeWardrobe(key: string): void {
  const list = getWardrobe().filter((item) => item.key !== key);
  writeJson(KEYS.wardrobe, list);
}

export function setWardrobe(rows: WardrobeItem[]): void {
  debouncedWrite(KEYS.wardrobe, rows.slice(0, 300));
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
  debouncedWrite(KEYS.feed, rows.slice(0, 120));
}

export function clearFeed(): void {
  writeJson(KEYS.feed, []);
}

export function getOnboardingPreferences(): OnboardingPreferences | null {
  const saved = readJson<OnboardingPreferences | null>(KEYS.onboarding, null);
  if (!saved || typeof saved !== 'object') return null;
  return {
    season: saved.season || '',
    stance: saved.stance || '',
    intensity: saved.intensity || '',
    completedAt: saved.completedAt || '',
  };
}

export function setOnboardingPreferences(value: OnboardingPreferences): void {
  writeJson(KEYS.onboarding, value);
}

export function hasCompletedOnboarding(): boolean {
  return Boolean(getOnboardingPreferences()?.completedAt);
}

export function getAuthToken(): string {
  // HTTP-only cookie tabanlı session kullanılıyor.
  // Token client tarafında okunmuyor.
  return '';
}

export function setAuthToken(token: string): void {
  // Artık kullanılmıyor; session cookie'leri server tarafında ayarlanıyor.
  void token;
}
