'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { LockKeyhole, LogOut, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { authAction, readableError } from '@/lib/client/api';
import { getWardrobe } from '@/lib/client/storage';
import { useBillingEntitlement } from '@/lib/client/useBillingEntitlement';
import { useUserStore } from '@/lib/store/userStore';

interface SessionUser {
  id: string;
  email: string;
  name: string;
  isPro?: boolean;
  proActivatedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  lastLoginAt?: string | null;
  profile?: {
    displayName?: string;
  };
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

export default function ProfilePageClient({
  redirectTarget = '',
}: {
  redirectTarget?: string;
}) {
  const router = useRouter();
  const entitlement = useBillingEntitlement();
  const isProFromStore = useUserStore((state) => state.isPro);
  const dailyUsed = useUserStore((state) => state.dailyUsed);
  const dailyLimit = useUserStore((state) => state.dailyLimit);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [user, setUser] = useState<SessionUser | null>(null);

  const isLoggedIn = Boolean(user);
  const isPro = Boolean(user?.isPro || isProFromStore || entitlement.tier === 'pro');
  const planLabel = isPro ? 'Pro' : 'Ücretsiz';
  const usageLabel = dailyLimit >= 9999 ? `${dailyUsed}/∞` : `${dailyUsed}/${dailyLimit}`;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await authAction<{ user: SessionUser }>({}, 'GET');
        if (cancelled) return;
        setUser(response.user);
        setName(response.user.profile?.displayName || response.user.name || '');
        useUserStore.getState().hydrate({
          isPro: Boolean(response.user.isPro),
        });
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setSessionReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const headline = useMemo(() => {
    if (!isLoggedIn) return 'Kimliğini bağla, dolabın seninle kalsın.';
    return `${user?.profile?.displayName || user?.name || 'Profilin'} hazır.`;
  }, [isLoggedIn, user?.name, user?.profile?.displayName]);

  async function completeAuth(nextUser: SessionUser, message: string): Promise<void> {
    setUser(nextUser);
    setName(nextUser.profile?.displayName || nextUser.name || '');
    useUserStore.getState().hydrate({
      isPro: Boolean(nextUser.isPro),
      wardrobeCount: getWardrobe().length,
    });
    setNotice(message);

    if (redirectTarget.startsWith('/')) {
      router.push(redirectTarget as Route);
    } else {
      router.refresh();
    }
  }

  async function runRegister(): Promise<void> {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await authAction<{ user: SessionUser }>({
        action: 'register',
        name,
        email,
        password,
      });
      await completeAuth(response.user, 'Hesabın hazır. Şimdi uygulama seni tanıyor.');
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function runLogin(): Promise<void> {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await authAction<{ user: SessionUser }>({
        action: 'login',
        email,
        password,
        localWardrobe: getWardrobe(),
      });
      await completeAuth(response.user, 'Tekrar hoş geldin.');
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function logout(): Promise<void> {
    if (!isLoggedIn) return;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await authAction<{ ok: boolean }>({ action: 'logout' }, 'POST');
      useUserStore.getState().setPro(false);
      setUser(null);
      setPassword('');
      setNotice('Çıkış yapıldı.');
      router.refresh();
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <TopBar title="Profil" />
      <div className="px-4 py-4 pb-24 sm:px-6 sm:py-5 md:px-8 md:py-6 md:pb-6">
        <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <Card className="p-5 md:p-6" glow="purple">
            <CardTitle>Kimlik</CardTitle>
            <h1 className="mt-3 text-[2rem] font-semibold leading-[1.02] text-cream">{headline}</h1>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              {isLoggedIn
                ? 'Oturumun açık. Planını, kullanım hakkını ve üyelik bilgilerini burada takip edebilirsin.'
                : 'Giriş yap ya da hesap oluştur; dolabın, geçmişin ve Pro erişimin cihazlar arasında senkron kalsın.'}
            </p>

            {!isLoggedIn ? (
              <>
                <div className="mt-6 space-y-3">
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="E-posta"
                    className="w-full rounded-xl border border-white/[.08] bg-transparent p-3 text-cream outline-none focus:border-[var(--gold-line)]"
                  />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Şifre"
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

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={runLogin}
                    className="flex-1 rounded-xl border border-white/20 bg-white/5 py-3.5 text-sm font-semibold tracking-wider text-white/80 transition-colors active:bg-white/10 disabled:opacity-50"
                  >
                    Giriş Yap
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={runRegister}
                    className="flex-1 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-3.5 text-sm font-bold tracking-wider text-black shadow-[0_4px_16px_rgba(217,119,6,0.3)] transition-transform active:scale-[0.98] disabled:opacity-50"
                  >
                    Kayıt Ol
                  </button>
                </div>

                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[.03] px-4 py-4">
                  <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.8} />
                  <p className="text-[13px] leading-relaxed text-cream/76">
                    Korunan rotalara geçmek için giriş yapman gerekir. Pro rotalarda girişten sonra paketler sayfasına yönlendirilirsin.
                  </p>
                </div>
              </>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-white/[.08] bg-white/[.03] p-4">
                  <p className="text-[10px] font-mono uppercase tracking-[.16em] text-gold/80">Oturum</p>
                  <p className="mt-3 text-[15px] font-medium text-cream">{user?.profile?.displayName || user?.name}</p>
                  <p className="mt-1 text-[13px] text-muted">{user?.email}</p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/[.08] bg-white/[.03] p-4">
                    <p className="text-[10px] font-mono uppercase tracking-[.16em] text-muted">Plan</p>
                    <p className={`mt-3 text-[1.4rem] font-semibold ${isPro ? 'text-emerald-300' : 'text-cream'}`}>{planLabel}</p>
                    <p className="mt-2 text-[12px] text-muted">
                      {isPro
                        ? `Aktivasyon: ${formatDate(user?.proActivatedAt)}`
                        : 'İstediğin anda tek tıkla Pro açılabilir.'}
                    </p>
                    {!isPro ? (
                      <Link
                        href="/paketler"
                        className="mt-4 inline-flex rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)] px-3 py-2 text-[10px] font-mono uppercase tracking-[.12em] text-gold transition-colors hover:bg-[var(--gold-dim)]/35"
                      >
                        Pro&apos;ya Geç
                      </Link>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-white/[.08] bg-white/[.03] p-4">
                    <p className="text-[10px] font-mono uppercase tracking-[.16em] text-muted">Bugünkü kullanım</p>
                    <p className="mt-3 text-[1.4rem] font-semibold text-cream">{usageLabel}</p>
                    <p className="mt-2 text-[12px] text-muted">
                      {isPro ? 'Pro hesaplarda günlük analiz sınırı yok.' : 'Ücretsiz hesaplarda günlük 3 analiz hakkı bulunur.'}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[.08] bg-white/[.03] p-4">
                  <p className="text-[10px] font-mono uppercase tracking-[.16em] text-muted">Üyelik</p>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[12px] text-muted">Katılım tarihi</p>
                      <p className="mt-1 text-[15px] text-cream">{formatDate(user?.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-[12px] text-muted">Son giriş</p>
                      <p className="mt-1 text-[15px] text-cream">{formatDate(user?.lastLoginAt)}</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={loading || !sessionReady}
                  onClick={logout}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 py-3.5 text-sm font-medium tracking-wide text-red-300 transition-colors active:bg-red-500/10 disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.8} />
                  Çıkış Yap
                </button>
              </div>
            )}
          </Card>

          <div className="space-y-5">
            <Card className="p-5 md:p-6">
              <CardTitle>Plan Ayrımı</CardTitle>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/[.08] bg-white/[.03] p-4">
                  <p className="text-[10px] font-mono uppercase tracking-[.16em] text-muted">Ücretsiz</p>
                  <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-cream/82">
                    <li>Günlük 3 analiz</li>
                    <li>5 parfüm dolap limiti</li>
                    <li>Temel nota ve koku profili</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-[var(--gold-line)] bg-[var(--gold-dim)]/10 p-4">
                  <p className="text-[10px] font-mono uppercase tracking-[.16em] text-gold">Pro</p>
                  <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-cream/88">
                    <li>Sınırsız analiz</li>
                    <li>Sınırsız dolap ve tam molekül görünürlüğü</li>
                    <li>Karşılaştırma, Katmanlama Lab ve Nota Avcısı erişimi</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-5 md:p-6 hover-lift">
              <CardTitle>Koku Dedektifi Profili</CardTitle>
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/8 bg-black/10 px-4 py-4">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.8} />
                <p className="text-[13px] leading-relaxed text-cream/76">
                  Hesabın açıkken analizlerin geçmişe yazılır, dolabın cihazlar arasında senkron kalır ve Pro aktivasyonu anında bütün yüzeylere yansır.
                </p>
              </div>
            </Card>
          </div>
        </div>

        {error ? <p className="mt-4 text-[12px] text-[#f1a2a2]">{error}</p> : null}
        {notice ? <p className="mt-2 text-[12px] text-[#9fdcc6]">{notice}</p> : null}
      </div>
    </AppShell>
  );
}
