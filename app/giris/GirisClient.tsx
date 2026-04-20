'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AuthCard, AuthInput, AuthButton, AuthDivider } from '@/components/auth/AuthCard';
import { authAction, readableError } from '@/lib/client/api';
import { getWardrobe } from '@/lib/client/storage';
import { useUserStore } from '@/lib/store/userStore';

interface SessionUser {
  id: string;
  email: string;
  name: string;
  isPro?: boolean;
  profile?: { displayName?: string };
}

export default function GirisClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('E-posta ve şifre gerekli.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAction<{ user: SessionUser }>({
        action: 'login',
        email,
        password,
        localWardrobe: getWardrobe(),
      });

      useUserStore.getState().hydrate({
        isPro: Boolean(response.user.isPro),
      });

      router.push(redirectTarget.startsWith('/') ? (redirectTarget as Route) : ('/' as Route));
    } catch (err) {
      setError(readableError(err));
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter') void handleLogin();
  }

  return (
    <AuthCard
      title="Tekrar hoş geldin."
      subtitle="Analiz geçmişin ve dolabın seni bekliyor."
      footer={
        <>
          Hesabın yok mu?{' '}
          <Link href={`/kayit${redirectTarget !== '/' ? `?redirect=${encodeURIComponent(redirectTarget)}` : ''}` as Route} className="text-gold hover:underline">
            Kayıt ol
          </Link>
        </>
      }
    >
      <div className="space-y-3">
        <AuthInput
          label="E-posta"
          type="email"
          placeholder="ornek@email.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <AuthInput
          label="Şifre"
          type="password"
          placeholder="En az 8 karakter"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          error={error || undefined}
        />

        <div className="flex justify-end">
          <Link href={'/sifre-sifirla' as Route} className="text-[12px] text-muted hover:text-cream transition-colors">
            Şifremi unuttum
          </Link>
        </div>

        <AuthButton onClick={() => void handleLogin()} loading={loading}>
          Giriş Yap
        </AuthButton>

        <AuthDivider />

        {/* TODO: Google OAuth — requires Supabase Auth OAuth app setup */}
        <button
          type="button"
          disabled
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/[.08] bg-white/[.03] py-3.5 text-[13px] text-white/40 cursor-not-allowed"
          title="Yakında aktif olacak"
        >
          <GoogleIcon />
          Google ile devam et
          <span className="ml-auto rounded-full bg-white/[.06] px-2 py-0.5 text-[10px] font-mono text-white/30">
            YAKINDA
          </span>
        </button>
      </div>
    </AuthCard>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" opacity=".4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" opacity=".4" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" opacity=".4" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" opacity=".4" />
    </svg>
  );
}
