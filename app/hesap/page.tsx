'use client';

import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { authAction, readableError } from '@/lib/client/api';
import { getAuthToken, setAuthToken } from '@/lib/client/storage';
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

export default function HesapPage() {
  const [token, setToken] = useState(() => getAuthToken());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [budgetBand, setBudgetBand] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [user, setUser] = useState<Profile | null>(null);

  async function runRegister(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const response = await authAction<{ token: string; user: Profile }>('', {
        action: 'register',
        name,
        email,
        password,
      });
      setAuthToken(response.token);
      setToken(response.token);
      setUser(response.user);
      setNotice('Kayıt başarılı.');
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
      const response = await authAction<{ token: string; user: Profile }>('', {
        action: 'login',
        email,
        password,
      });
      setAuthToken(response.token);
      setToken(response.token);
      setUser(response.user);
      setNotice('Giriş başarılı.');
    } catch (err) {
      setError(readableError(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadProfile(): Promise<void> {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await authAction<{ user: Profile }>(token, {}, 'GET');
      setUser(response.user);
      setName(response.user.name || '');
      setCity(response.user.profile?.city || '');
      setBudgetBand(response.user.profile?.budgetBand || '');
      setGender(response.user.profile?.gender || '');
      setNotice('Profil yüklendi.');
    } catch (err) {
      setError(readableError(err));
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(): Promise<void> {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await authAction<{ user: Profile }>(
        token,
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
      setUser(response.user);
      setNotice('Profil güncellendi.');
    } catch (err) {
      setError(readableError(err));
    } finally {
      setLoading(false);
    }
  }

  async function logout(): Promise<void> {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      await authAction<{ ok: boolean }>(token, { action: 'logout' }, 'POST');
      setAuthToken('');
      setToken('');
      setUser(null);
      setNotice('Çıkış yapıldı.');
    } catch (err) {
      setError(readableError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <TopBar title="Hesap" />
      <div className="px-5 md:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
          <Card className="p-5 md:p-6 hover-lift">
            <CardTitle>Kimlik</CardTitle>
            <div className="space-y-3">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-posta"
                className="w-full rounded-xl border border-white/[.08] bg-transparent p-3 text-cream outline-none focus:border-[var(--gold-line)]"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifre"
                type="password"
                className="w-full rounded-xl border border-white/[.08] bg-transparent p-3 text-cream outline-none focus:border-[var(--gold-line)]"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ad Soyad"
                className="w-full rounded-xl border border-white/[.08] bg-transparent p-3 text-cream outline-none focus:border-[var(--gold-line)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button type="button" disabled={loading} onClick={runLogin} className="py-2.5 rounded-lg text-[11px] uppercase tracking-[.08em] border border-white/[.08] text-cream hover:border-[var(--gold-line)] transition-colors">
                {UI.login}
              </button>
              <button type="button" disabled={loading} onClick={runRegister} className="py-2.5 rounded-lg text-[11px] uppercase tracking-[.08em] bg-gold text-bg hover:bg-[#d7b576] transition-colors">
                {UI.register}
              </button>
            </div>
            <button type="button" disabled={!token || loading} onClick={logout} className="w-full mt-2 py-2.5 rounded-lg text-[11px] uppercase tracking-[.08em] border border-white/[.08] text-muted hover:text-cream transition-colors disabled:opacity-40">
              {UI.logout}
            </button>
            <button type="button" disabled={!token || loading} onClick={loadProfile} className="w-full mt-2 py-2.5 rounded-lg text-[11px] uppercase tracking-[.08em] border border-white/[.08] text-muted hover:text-cream transition-colors disabled:opacity-40">
              Profili Yükle
            </button>
          </Card>

          <Card className="p-5 md:p-6 hover-lift">
            <CardTitle>Profil ve Tercihler</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={UI.city} className="w-full rounded-xl border border-white/[.08] bg-transparent p-3 text-cream outline-none focus:border-[var(--gold-line)]" />
              <input value={budgetBand} onChange={(e) => setBudgetBand(e.target.value)} placeholder={UI.budgetRange} className="w-full rounded-xl border border-white/[.08] bg-transparent p-3 text-cream outline-none focus:border-[var(--gold-line)]" />
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full rounded-xl border border-white/[.08] bg-[#15131a] p-3 text-cream outline-none focus:border-[var(--gold-line)]">
                <option value="">Stil seç</option>
                <option value="female">Kadın</option>
                <option value="male">Erkek</option>
                <option value="unisex">Unisex</option>
              </select>
            </div>
            <button type="button" disabled={!token || loading} onClick={saveProfile} className="mt-4 px-5 py-2.5 rounded-lg text-[11px] uppercase tracking-[.08em] bg-gold text-bg hover:bg-[#d8b676] disabled:opacity-40 transition-colors">
              {UI.saveProfile}
            </button>

            {user ? (
              <div className="mt-5 border-t border-white/[.06] pt-4 text-[12px] text-muted space-y-1">
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

        {error ? <p className="text-[12px] text-[#f1a2a2] mt-4">{error}</p> : null}
        {notice ? <p className="text-[12px] text-[#9fdcc6] mt-2">{notice}</p> : null}
      </div>
    </AppShell>
  );
}

