'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { authAction, readableError } from '@/lib/client/api';
import { useUserStore } from '@/lib/store/userStore';

interface SessionUser {
  id: string;
  email: string;
  name: string;
  isPro?: boolean;
  proActivatedAt?: string | null;
  createdAt?: string | null;
  profile?: { displayName?: string };
}

function Input({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-muted/80">{label}</label>
      <input
        className={`w-full rounded-xl border bg-white/[.04] px-4 py-3 text-[14px] text-cream outline-none transition-colors placeholder:text-muted/50 focus:bg-white/[.06] ${error ? 'border-red-500/40 focus:border-red-500/60' : 'border-white/[.08] focus:border-[var(--gold-line)]'}`}
        {...props}
      />
      {error ? <p className="text-[12px] text-red-400">{error}</p> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 md:p-6">
      <CardTitle>{title}</CardTitle>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

export default function HesapClient() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameNotice, setNameNotice] = useState('');
  const [nameError, setNameError] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwNotice, setPwNotice] = useState('');
  const [pwError, setPwError] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showDeleteSection, setShowDeleteSection] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const response = await authAction<{ user: SessionUser }>({}, 'GET');
        setUser(response.user);
        setDisplayName(response.user.profile?.displayName || response.user.name || '');
      } catch {
        router.push('/giris?redirect=/hesap' as Route);
      } finally {
        setSessionReady(true);
      }
    })();
  }, [router]);

  async function handleNameSave() {
    if (!displayName.trim()) return;
    setNameLoading(true);
    setNameError('');
    setNameNotice('');
    try {
      const response = await authAction<{ user: SessionUser }>(
        { profile: { displayName: displayName.trim() } },
        'PATCH',
      );
      setUser(response.user);
      setNameNotice('İsim güncellendi.');
    } catch (err) {
      setNameError(readableError(err));
    } finally {
      setNameLoading(false);
    }
  }

  async function handlePasswordChange() {
    if (!oldPassword || !newPassword) {
      setPwError('Her iki alan da zorunlu.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('Yeni şifre en az 8 karakter olmalı.');
      return;
    }
    setPwLoading(true);
    setPwError('');
    setPwNotice('');
    try {
      await authAction<{ ok: boolean }>(
        { action: 'change-password', oldPassword, newPassword },
        'POST',
      );
      setOldPassword('');
      setNewPassword('');
      setPwNotice('Şifre güncellendi.');
    } catch (err) {
      setPwError(readableError(err));
    } finally {
      setPwLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm.toLowerCase() !== 'sil') {
      setDeleteError('"sil" yazarak silme işlemini onayla.');
      return;
    }
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await authAction<{ ok: boolean }>({ action: 'delete-account' }, 'POST');
      useUserStore.getState().setPro(false);
      router.push('/' as Route);
    } catch (err) {
      setDeleteError(readableError(err));
      setDeleteLoading(false);
    }
  }

  if (!sessionReady) {
    return (
      <AppShell>
        <TopBar title="Hesap" />
        <div className="flex min-h-[40dvh] items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-gold" />
        </div>
      </AppShell>
    );
  }

  if (!user) return null;

  return (
    <AppShell>
      <TopBar title="Hesap" />
      <div className="px-4 py-4 pb-24 sm:px-6 md:px-8 md:py-6 md:pb-6">
        <div className="mx-auto max-w-[600px] space-y-5">
          <Section title="Profil Bilgileri">
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/[.07] bg-white/[.02] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[.14em] font-mono text-muted/70">E-posta</p>
                <p className="mt-1 text-[14px] text-cream/80">{user.email}</p>
              </div>

              <Input
                label="Görünen Ad"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Adın nasıl görünsün?"
                maxLength={60}
                error={nameError || undefined}
              />
              {nameNotice ? <p className="text-[12px] text-emerald-400">{nameNotice}</p> : null}
              <button
                type="button"
                disabled={nameLoading}
                onClick={() => void handleNameSave()}
                className="rounded-xl border border-white/[.12] bg-white/[.05] px-5 py-2.5 text-[13px] font-medium text-cream/80 transition-colors hover:bg-white/[.08] disabled:opacity-50"
              >
                {nameLoading ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </Section>

          <Section title="Şifre Değiştir">
            <div className="space-y-3">
              <Input
                label="Mevcut Şifre"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
              <Input
                label="Yeni Şifre"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="En az 8 karakter"
                error={pwError || undefined}
              />
              {pwNotice ? <p className="text-[12px] text-emerald-400">{pwNotice}</p> : null}
              <button
                type="button"
                disabled={pwLoading}
                onClick={() => void handlePasswordChange()}
                className="rounded-xl border border-white/[.12] bg-white/[.05] px-5 py-2.5 text-[13px] font-medium text-cream/80 transition-colors hover:bg-white/[.08] disabled:opacity-50"
              >
                {pwLoading ? 'Güncelleniyor…' : 'Şifreyi Güncelle'}
              </button>
            </div>
          </Section>

          <Section title="Yasal">
            <div className="space-y-2 text-[13px]">
              <Link href={'/gizlilik' as Route} className="flex items-center justify-between rounded-xl border border-white/[.07] bg-white/[.02] px-4 py-3 text-cream/80 transition-colors hover:border-white/[.12] hover:text-cream">
                <span>Gizlilik Politikası</span>
                <ChevronRight />
              </Link>
              <Link href={'/kullanim-kosullari' as Route} className="flex items-center justify-between rounded-xl border border-white/[.07] bg-white/[.02] px-4 py-3 text-cream/80 transition-colors hover:border-white/[.12] hover:text-cream">
                <span>Kullanım Koşulları</span>
                <ChevronRight />
              </Link>
            </div>
          </Section>

          <Section title="Hesabı Sil">
            <div className="space-y-4">
              <p className="text-[13px] leading-relaxed text-muted">
                Hesabını sildiğinde tüm analizlerin, dolabın ve üyelik bilgilerin kalıcı olarak silinir. Bu işlem geri alınamaz.
              </p>

              {!showDeleteSection ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteSection(true)}
                  className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-2.5 text-[13px] font-medium text-red-400 transition-colors hover:bg-red-500/10"
                >
                  Hesabımı Sil
                </button>
              ) : (
                <div className="space-y-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                  <p className="text-[13px] font-medium text-red-300">
                    Onaylamak için aşağıya <strong>sil</strong> yaz:
                  </p>
                  <Input
                    label="Onay"
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="sil"
                    error={deleteError || undefined}
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setShowDeleteSection(false); setDeleteConfirm(''); setDeleteError(''); }}
                      className="flex-1 rounded-xl border border-white/[.10] bg-white/[.04] py-2.5 text-[13px] text-muted transition-colors hover:text-cream"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="button"
                      disabled={deleteLoading}
                      onClick={() => void handleDeleteAccount()}
                      className="flex-1 rounded-xl bg-red-600/80 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                    >
                      {deleteLoading ? 'Siliniyor…' : 'Kalıcı Olarak Sil'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>
    </AppShell>
  );
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M5 2l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
