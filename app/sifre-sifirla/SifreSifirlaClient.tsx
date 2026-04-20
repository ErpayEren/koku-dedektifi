'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useState } from 'react';
import { AuthCard, AuthInput, AuthButton } from '@/components/auth/AuthCard';
import { authAction, readableError } from '@/lib/client/api';

export default function SifreSifirlaClient() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!email.trim()) {
      setError('E-posta adresi gerekli.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authAction<{ ok: boolean }>({ action: 'forgot-password', email }, 'POST');
      setSent(true);
    } catch (err) {
      setError(readableError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Şifreni sıfırla."
      subtitle={sent ? undefined : 'E-posta adresini gir, sıfırlama bağlantısını gönderelim.'}
      footer={
        <Link href={'/giris' as Route} className="text-gold hover:underline">
          ← Giriş sayfasına dön
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4 text-[13px] text-emerald-400">
          Sıfırlama bağlantısı <strong>{email}</strong> adresine gönderildi. Spam klasörünü de kontrol et.
        </div>
      ) : (
        <div className="space-y-3">
          <AuthInput
            label="E-posta"
            type="email"
            placeholder="ornek@email.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleSubmit(); }}
            error={error || undefined}
          />
          <AuthButton onClick={() => void handleSubmit()} loading={loading}>
            Sıfırlama Bağlantısı Gönder
          </AuthButton>
        </div>
      )}
    </AuthCard>
  );
}
