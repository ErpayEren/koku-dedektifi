'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { authAction, readableError } from '@/lib/client/api';
import { getWardrobe, setWardrobe } from '@/lib/client/storage';
import type { WardrobeItem } from '@/lib/client/types';
import { UI } from '@/lib/strings';

interface Profile {
  id: string;
  email: string;
  name: string;
  profile?: {
    displayName?: string;
    city?: string;
    budgetBand?: string;
    gender?: string;
  };
}

interface WardrobeResponse {
  shelf?: Record<string, Omit<WardrobeItem, 'key'>>;
}

function mergeWardrobeRows(localRows: WardrobeItem[], serverRows: WardrobeItem[]): WardrobeItem[] {
  const merged = new Map<string, WardrobeItem>();

  for (const item of localRows) {
    if (!item?.key) continue;
    merged.set(item.key, item);
  }

  for (const item of serverRows) {
    if (!item?.key) continue;
    const existing = merged.get(item.key);
    if (!existing) {
      merged.set(item.key, item);
      continue;
    }
    const existingTime = Date.parse(existing.updatedAt || '');
    const nextTime = Date.parse(item.updatedAt || '');
    if (!Number.isFinite(existingTime) || (Number.isFinite(nextTime) && nextTime >= existingTime)) {
      merged.set(item.key, item);
    }
  }

  return Array.from(merged.values()).sort((left, right) => {
    const leftTime = Date.parse(left.updatedAt || '');
    const rightTime = Date.parse(right.updatedAt || '');
    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
  });
}

export default function HesapPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [budgetBand, setBudgetBand] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [user, setUser] = useState<Profile | null>(null);

  const isLoggedIn = useMemo(() => Boolean(user), [user]);

  async function syncWardrobeFromServer(): Promise<void> {
    try {
      const response = await fetch('/api/wardrobe', {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) return;

      const data = (await response.json()) as WardrobeResponse;
      const serverShelf = data?.shelf && typeof data.shelf === 'object' ? data.shelf : {};
      const serverRows = Object.entries(serverShelf).map(([key, value]) => ({
        key,
        ...value,
      }));

      setWardrobe(mergeWardrobeRows(getWardrobe(), serverRows));
    } catch (syncError) {
      console.warn('[hesap] Wardrobe sync skipped.', syncError);
    }
  }

  function hydrateProfile(nextUser: Profile): void {
    setUser(nextUser);
    setName(nextUser.profile?.displayName || nextUser.name || '');
    setCity(nextUser.profile?.city || '');
    setBudgetBand(nextUser.profile?.budgetBand || '');
    setGender(nextUser.profile?.gender || '');
  }

  useEffect(() => {
    void (async () => {
      try {
        const response = await authAction<{ user: Profile }>({}, 'GET');
        hydrateProfile(response.user);
        await syncWardrobeFromServer();
      } catch {
        setUser(null);
      } finally {
        setSessionReady(true);
      }
    })();
  }, []);

  async function runRegister(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const response = await authAction<{ user: Profile }>({
        action: 'register',
        name,
        email,
        password,
      });
      hydrateProfile(response.user);
      setNotice('Kayit basarili.');
    } catch (err) {
      setError(readableError(err));
    } finally {
      setLoading(false);
    }
  }

  async function runLogin(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const response = await authAction<{ user: Profile }>({
        action: 'login',
        email,
        password,
        localWardrobe: getWardrobe(),
      });
      hydrateProfile(response.user);
      await syncWardrobeFromServer();
      setNotice('Giris basarili.');
    } catch (err) {
      setError(readableError(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadProfile(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const response = await authAction<{ user: Profile }>({}, 'GET');
      hydrateProfile(response.user);
      await syncWardrobeFromServer();
      setNotice('Profil yuklendi.');
    } catch (err) {
      setError(readableError(err));
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(): Promise<void> {
    if (!isLoggedIn) return;
    setLoading(true);
    setError('');
    try {
      const response = await authAction<{ user: Profile }>(
        {
          profile: {
            displayName: name,
            city,
            budgetBand,
            gender,
          },
        },
        'PATCH',
      );
      hydrateProfile(response.user);
      setNotice('Profil guncellendi.');
    } catch (err) {
      setError(readableError(err));
    } finally {
      setLoading(false);
    }
  }

  async function logout(): Promise<void> {
    if (!isLoggedIn) return;
    setLoading(true);
    setError('');
    try {
      await authAction<{ ok: boolean }>({ action: 'logout' }, 'POST');
      setUser(null);
      setNotice('Cikis yapildi.');
    } catch (err) {
      setError(readableError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <TopBar title="Hesap" />

      <div className="min-h-0 px-5 py-8 pb-24 md:px-12 md:pb-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
          <Card className="p-5 md:p-6 hover-lift">
            <CardTitle>Kimlik</CardTitle>

            <div className="space-y-3">
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="E-posta"
                className="w-full rounded-xl border border-white/[.08] bg-transparent p-3 text-cream outline-none focus:border-[var(--gold-line)]"
              />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Sifre"
                type="password"
                className="w-full rounded-xl border border-white/[.08] bg-transparent p-3 text-cream outline-none focus:border-[var(--gold-line)]"
              />
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ad Soyad"
                className="w-full rounded-xl border border-white/[.08] bg-transparent p-3 text-cream outline-none focus:border-[var(--gold-line)]"
              />
            </div>

            <div className="mt-2 flex gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={runLogin}
                className="flex-1 rounded-xl border border-white/20 bg-white/5 py-3.5 text-sm font-semibold tracking-wider text-white/80 transition-colors active:bg-white/10"
              >
                GİRİŞ YAP
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={runRegister}
                className="flex-1 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-3.5 text-sm font-bold tracking-wider text-black shadow-[0_4px_16px_rgba(217,119,6,0.3)] transition-transform active:scale-[0.98]"
              >
                KAYIT OL
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={!isLoggedIn || loading || !sessionReady}
                onClick={loadProfile}
                className="w-full rounded-xl border border-white/10 bg-white/4 py-3 text-xs font-medium tracking-widest text-white/50 transition-colors active:bg-white/8 disabled:opacity-40"
              >
                PROFİLİ YÜKLE
              </button>
              <button
                type="button"
                disabled={!isLoggedIn || loading}
                onClick={logout}
                className="w-full rounded-xl border border-red-500/20 bg-red-500/5 py-3 text-xs font-medium tracking-widest text-red-400/70 transition-colors active:bg-red-500/10 disabled:opacity-40"
              >
                ÇIKIŞ YAP
              </button>
            </div>
          </Card>

          <Card className="p-5 md:p-6 hover-lift">
            <CardTitle>Profil ve Tercihler</CardTitle>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder={UI.city}
                className="w-full rounded-xl border border-white/[.08] bg-transparent p-3 text-cream outline-none focus:border-[var(--gold-line)]"
              />
              <input
                value={budgetBand}
                onChange={(event) => setBudgetBand(event.target.value)}
                placeholder={UI.budgetRange}
                className="w-full rounded-xl border border-white/[.08] bg-transparent p-3 text-cream outline-none focus:border-[var(--gold-line)]"
              />
              <select
                value={gender}
                onChange={(event) => setGender(event.target.value)}
                className="w-full rounded-xl border border-white/[.08] bg-[#15131a] p-3 text-cream outline-none focus:border-[var(--gold-line)]"
              >
                <option value="">Stil sec</option>
                <option value="female">Kadin</option>
                <option value="male">Erkek</option>
                <option value="unisex">Unisex</option>
              </select>
            </div>

            <button
              type="button"
              disabled={!isLoggedIn || loading}
              onClick={saveProfile}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-4 text-sm font-bold tracking-widest text-black shadow-[0_4px_20px_rgba(217,119,6,0.3)] transition-transform active:scale-[0.99] disabled:opacity-40"
            >
              PROFİLİ KAYDET
            </button>

            {user ? (
              <div className="mt-5 space-y-1 border-t border-white/[.06] pt-4 text-[12px] text-muted">
                <p>
                  <span className="text-cream">ID:</span> {user.id}
                </p>
                <p>
                  <span className="text-cream">E-posta:</span> {user.email}
                </p>
                <p>
                  <span className="text-cream">Ad:</span> {user.name}
                </p>
              </div>
            ) : null}
          </Card>
        </div>

        {error ? <p className="mt-4 text-[12px] text-[#f1a2a2]">{error}</p> : null}
        {notice ? <p className="mt-2 text-[12px] text-[#9fdcc6]">{notice}</p> : null}
      </div>
    </AppShell>
  );
}
