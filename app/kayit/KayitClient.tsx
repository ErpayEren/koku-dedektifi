'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AuthCard, AuthInput, AuthButton } from '@/components/auth/AuthCard';
import { authAction, readableError } from '@/lib/client/api';
import { useUserStore } from '@/lib/store/userStore';

interface SessionUser {
  id: string;
  email: string;
  name: string;
  isPro?: boolean;
  profile?: { displayName?: string };
}

export default function KayitClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; general?: string }>({});

  function validate(): boolean {
    const next: typeof errors = {};
    if (!name.trim() || name.trim().length < 2) next.name = 'Ad en az 2 karakter olmalı.';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Geçerli bir e-posta gir.';
    if (password.length < 8) next.password = 'Şifre en az 8 karakter olmalı.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const response = await authAction<{ user: SessionUser }>({
        action: 'register',
        name: name.trim(),
        email,
        password,
      });

      useUserStore.getState().hydrate({
        isPro: Boolean(response.user.isPro),
      });

      router.push(redirectTarget.startsWith('/') ? (redirectTarget as Route) : ('/' as Route));
    } catch (err) {
      setErrors({ general: readableError(err) });
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter') void handleRegister();
  }

  return (
    <AuthCard
      title="Hesabını oluştur."
      subtitle="Ücretsiz başla. Analiz geçmişin ve dolabın cihazlar arasında senkron kalır."
      footer={
        <>
          Zaten hesabın var mı?{' '}
          <Link href={`/giris${redirectTarget !== '/' ? `?redirect=${encodeURIComponent(redirectTarget)}` : ''}` as Route} className="text-gold hover:underline">
            Giriş yap
          </Link>
        </>
      }
    >
      <div className="space-y-3">
        <AuthInput
          label="Ad Soyad"
          type="text"
          placeholder="Adın ve soyadın"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          error={errors.name}
        />
        <AuthInput
          label="E-posta"
          type="email"
          placeholder="ornek@email.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          error={errors.email}
        />
        <AuthInput
          label="Şifre"
          type="password"
          placeholder="En az 8 karakter"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          error={errors.password}
        />

        {errors.general ? (
          <p className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[13px] text-red-400">
            {errors.general}
          </p>
        ) : null}

        <AuthButton onClick={() => void handleRegister()} loading={loading}>
          Kayıt Ol
        </AuthButton>

        <p className="text-[11px] text-muted/60 text-center leading-relaxed">
          Kayıt olarak{' '}
          <Link href={'/kullanim-kosullari' as Route} className="underline hover:text-muted transition-colors">
            Kullanım Koşullarını
          </Link>{' '}
          ve{' '}
          <Link href={'/gizlilik' as Route} className="underline hover:text-muted transition-colors">
            Gizlilik Politikasını
          </Link>{' '}
          kabul etmiş olursun.
        </p>

      </div>
    </AuthCard>
  );
}

