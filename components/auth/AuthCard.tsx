'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { Logo } from '@/components/ui/Logo';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12 pt-[max(env(safe-area-inset-top),48px)] pb-[max(env(safe-area-inset-bottom),48px)]">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex justify-center">
          <Link href={'/' as Route}>
            <Logo size="md" />
          </Link>
        </div>

        <div className="rounded-2xl border border-white/[.07] bg-[var(--bg-card)] p-6 shadow-[0_24px_64px_rgba(0,0,0,.4)]">
          <h1 className="text-[1.5rem] font-semibold leading-tight text-cream">{title}</h1>
          {subtitle ? <p className="mt-2 text-[13px] leading-relaxed text-muted">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
        </div>

        {footer ? <div className="mt-5 text-center text-[13px] text-muted">{footer}</div> : null}

        <div className="mt-8 flex items-center justify-center gap-4 text-[11px] text-muted/60">
          <Link href={'/gizlilik' as Route} className="hover:text-muted transition-colors">
            Gizlilik
          </Link>
          <span>·</span>
          <Link href={'/kullanim-kosullari' as Route} className="hover:text-muted transition-colors">
            Kullanım Koşulları
          </Link>
        </div>
      </div>
    </div>
  );
}

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function AuthInput({ label, error, className = '', ...props }: AuthInputProps) {
  return (
    <div className="space-y-1.5">
      {label ? <label className="text-[12px] font-medium text-muted/80">{label}</label> : null}
      <input
        className={`w-full rounded-xl border border-white/[.08] bg-white/[.04] px-4 py-3 text-[14px] text-cream outline-none transition-colors placeholder:text-muted/50 focus:border-[var(--gold-line)] focus:bg-white/[.06] ${error ? 'border-red-500/40' : ''} ${className}`}
        {...props}
      />
      {error ? <p className="text-[12px] text-red-400">{error}</p> : null}
    </div>
  );
}

export function AuthButton({
  children,
  loading,
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <button
      type="button"
      disabled={loading}
      className={
        variant === 'primary'
          ? 'w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-3.5 text-[14px] font-bold tracking-wide text-black shadow-[0_4px_20px_rgba(217,119,6,0.25)] transition-all active:scale-[0.98] disabled:opacity-50'
          : 'w-full rounded-xl border border-white/[.12] bg-white/[.05] py-3.5 text-[14px] font-semibold text-white/80 transition-colors hover:bg-white/[.08] active:bg-white/[.10] disabled:opacity-50'
      }
      {...props}
    >
      {loading ? <span className="opacity-70">Yükleniyor…</span> : children}
    </button>
  );
}

export function AuthDivider({ label = 'veya' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-white/[.06]" />
      <span className="text-[11px] text-muted/60">{label}</span>
      <div className="h-px flex-1 bg-white/[.06]" />
    </div>
  );
}
