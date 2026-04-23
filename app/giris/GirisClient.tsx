'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AuthCard, AuthInput, AuthButton } from '@/components/auth/AuthCard';
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

      </div>
    </AuthCard>
  );
}

