'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { useToastSync } from '@/lib/client/useToastSync';
import { useUserStore } from '@/lib/store/userStore';

interface BillingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  featured: boolean;
  features: string[];
}

interface BillingEntitlement {
  tier: 'free' | 'pro';
  status: string;
  source: string;
  updatedAt: string | null;
}

interface BillingUser {
  id: string;
  email: string;
  name: string;
}

interface BillingResponse {
  plan?: 'free' | 'pro';
  expiresAt?: string | null;
  provider: string;
  plans: BillingPlan[];
  entitlement: BillingEntitlement;
  user: BillingUser | null;
  devActivationAllowed?: boolean;
}

interface StartCheckoutResponse {
  checkoutId?: string;
  checkoutUrl?: string;
  provider?: string;
  planId?: string;
  error?: string;
  code?: string;
}

const PLAN_COPY: Record<'free' | 'pro', { name: string; features: string[]; note: string }> = {
  free: {
    name: 'Ücretsiz',
    note: 'Başlangıç seviyesi',
    features: ['Günlük 3 analiz', 'Temel nota analizi', '5 parfüm dolap limiti', 'Molekül önizlemesi (sadece isim)'],
  },
  pro: {
    name: 'Pro',
    note: 'Tüm ürün katmanı açık',
    features: [
      'Sınırsız analiz',
      'Tam molekül analizi ve detay sayfaları',
      'Sınırsız dolap',
      'Top 10 benzer parfüm önerisi',
      'Koku profili ve kişiselleştirme',
      'Parfümör gözüyle derin rapor',
      'Öncelikli destek',
    ],
  },
};

const DEFAULT_PLANS: BillingPlan[] = [
  {
    id: 'free',
    name: PLAN_COPY.free.name,
    price: 0,
    currency: 'TRY',
    interval: 'ay',
    featured: false,
    features: PLAN_COPY.free.features,
  },
  {
    id: 'pro',
    name: PLAN_COPY.pro.name,
    price: 49,
    currency: 'TRY',
    interval: 'ay',
    featured: true,
    features: PLAN_COPY.pro.features,
  },
];

function formatPrice(plan: BillingPlan): string {
  if (plan.price <= 0) return '0 TL';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: plan.currency || 'TRY',
    maximumFractionDigits: 0,
  }).format(plan.price);
}

function normalizePlans(plans: BillingPlan[] | undefined): BillingPlan[] {
  if (!Array.isArray(plans) || plans.length === 0) return DEFAULT_PLANS;

  return plans
    .filter((plan) => plan?.id === 'free' || plan?.id === 'pro')
    .map((plan) => ({
      ...plan,
      name: PLAN_COPY[plan.id as 'free' | 'pro'].name,
      features: PLAN_COPY[plan.id as 'free' | 'pro'].features,
    }));
}

const COMPARISON_ROWS: Array<{ label: string; free: string; pro: string }> = [
  { label: 'Günlük analiz', free: '3', pro: 'Sınırsız' },
  { label: 'Analiz yöntemi', free: 'Fotoğraf / Metin / Nota', pro: 'Fotoğraf / Metin / Nota / Barkod' },
  { label: 'Benzer parfümler', free: 'İlk 3', pro: 'Top 10' },
  { label: 'Moleküler analiz', free: 'Sadece isim', pro: 'Tam detay + SMILES + kanıt seviyesi' },
  { label: 'Parfüm dolabı', free: '5 parfüm', pro: 'Sınırsız' },
  { label: 'Paylaşım linki', free: '✓', pro: '✓' },
  { label: 'Kişiselleştirilmiş öneri', free: '—', pro: '✓' },
  { label: 'Parfümör raporu', free: '—', pro: '✓' },
  { label: 'Öncelikli destek', free: '—', pro: '✓' },
];

function ComparisonTable() {
  return (
    <div className="mt-10">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="h-px w-7 bg-[var(--gold-line)]" />
        <span className="text-[10px] font-mono uppercase tracking-[.16em] text-muted">Özellik Karşılaştırması</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[.06]">
        {/* Header */}
        <div className="grid grid-cols-[1fr_96px_96px] border-b border-white/[.06] bg-black/20 px-4 py-3">
          <span className="text-[10px] font-mono uppercase tracking-[.1em] text-muted">Özellik</span>
          <span className="text-center text-[10px] font-mono uppercase tracking-[.1em] text-muted">Ücretsiz</span>
          <span className="text-center text-[10px] font-mono uppercase tracking-[.1em] text-gold">Pro</span>
        </div>

        {COMPARISON_ROWS.map((row, i) => (
          <div
            key={row.label}
            className={`grid grid-cols-[1fr_96px_96px] items-center px-4 py-3 ${
              i % 2 === 0 ? 'bg-white/[.015]' : 'bg-transparent'
            }`}
          >
            <span className="text-[13px] text-cream/80">{row.label}</span>
            <span className="text-center text-[12px] text-muted">{row.free}</span>
            <span className="text-center text-[12px] text-gold">{row.pro}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanCard({
  activeTier,
  busyPlanId,
  onActivate,
  plan,
}: {
  activeTier: 'free' | 'pro';
  busyPlanId: string;
  onActivate: (planId: string) => Promise<void>;
  plan: BillingPlan;
}) {
  const isActive = activeTier === plan.id;
  const isBusy = busyPlanId === plan.id;
  const copy = PLAN_COPY[plan.id as 'free' | 'pro'];

  return (
    <Card
      className={`relative overflow-hidden p-6 md:p-7 hover-lift ${
        plan.featured ? 'border-[var(--gold-line)] shadow-[0_24px_52px_rgba(201,169,110,.08)]' : ''
      }`}
      glow={plan.featured}
    >
      {plan.featured ? (
        <div className="absolute right-4 top-4 rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)] px-2.5 py-1 text-[9px] font-mono uppercase tracking-[.1em] text-gold">
          Önerilen
        </div>
      ) : null}

      <CardTitle>{copy.name}</CardTitle>
      <div className="mt-3">
        <p className="text-[2.6rem] font-bold leading-none text-cream">{formatPrice(plan)}</p>
        <p className="mt-2 text-[12px] text-muted">{copy.note}</p>
      </div>

      <ul className="mt-6 space-y-2.5">
        {copy.features.map((feature) => (
          <li key={`${plan.id}-${feature}`} className="flex items-start gap-2 text-[13px] text-cream/90">
            <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={plan.id !== 'pro' || isActive || isBusy}
        onClick={() => void onActivate(plan.id)}
        className={`mt-7 w-full rounded-xl py-3 text-[11px] font-mono uppercase tracking-[.1em] transition-colors ${
          plan.id !== 'pro'
            ? 'border border-white/[.08] bg-white/[.04] text-muted'
            : isActive
              ? 'border border-emerald-500/25 bg-emerald-500/12 text-emerald-300'
              : isBusy
                ? 'border border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold'
                : 'bg-gold text-bg hover:bg-[#d8b676]'
        }`}
      >
        {plan.id !== 'pro' ? 'Ücretsiz Başla' : isActive ? 'Pro Aktif ✓' : isBusy ? 'Aktif ediliyor...' : "Pro'ya Geç"}
      </button>
    </Card>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const isPro = useUserStore((state) => state.isPro);
  const [data, setData] = useState<BillingResponse | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyPlanId, setBusyPlanId] = useState('');

  useToastSync({ error, notice });

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/billing', {
          method: 'GET',
          credentials: 'include',
        });
        const payload = (await response.json().catch(() => null)) as BillingResponse | null;
        if (!response.ok || !payload) {
          throw new Error('Paketler yüklenemedi.');
        }
        setData(payload);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Paketler yüklenemedi.');
      }
    })();
  }, []);

  const plans = useMemo(() => normalizePlans(data?.plans), [data?.plans]);
  const activeTier = isPro || data?.plan === 'pro' || data?.entitlement?.tier === 'pro' ? 'pro' : 'free';

  async function activatePlan(planId: string): Promise<void> {
    if (planId !== 'pro') return;
    if (!data?.user) {
      router.push('/profil?redirect=%2Fpaketler' as Route);
      return;
    }

    setBusyPlanId(planId);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/billing', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start_checkout',
          planId,
        }),
      });

      const payload = (await response.json().catch(() => null)) as StartCheckoutResponse | null;

      if (response.status === 401) {
        router.push('/profil?redirect=%2Fpaketler' as Route);
        return;
      }

      if (!response.ok || !payload?.checkoutUrl) {
        throw new Error(payload?.error || 'Ödeme sayfası açılamadı.');
      }

      setNotice('Pro aktif! Tüm özellikler açıldı.');
      window.location.assign(payload.checkoutUrl);
    } finally {
      setBusyPlanId('');
    }
  }

  return (
    <AppShell hideSidebar>
      <TopBar title="Paketler" />
      <div className="px-5 py-8 md:px-12 md:py-10">
        <div className="mx-auto max-w-[1040px]">
          <div className="mb-6 flex items-center gap-2.5">
            <div className="h-px w-7 bg-[var(--gold-line)]" />
            <span className="text-[10px] font-mono uppercase tracking-[.16em] text-muted">Paketler</span>
          </div>

          <h1 className="text-[2.3rem] font-semibold leading-[1.06] text-cream md:text-[3rem]">
            Moleküler keşfi ücretsiz başlat,
            <br />
            <span className="text-gold">Pro ile tam derinliği aç.</span>
          </h1>

          <p className="mt-4 max-w-[620px] text-[13px] leading-relaxed text-muted">
            Ücretsiz katman hızlı analiz ve temel nota okuması sunar. Ürün olgunlaşana kadar{' '}
            <span className="text-cream">&quot;Pro&apos;ya Geç&quot;</span> tek tıkla hesabını Pro yapar.
          </p>

          <div className="mt-6 rounded-2xl border border-white/[.08] bg-black/10 px-4 py-3 text-[12px] text-muted">
            {data?.user ? (
              <>
                Aktif kullanıcı: <span className="text-cream">{data.user.name || data.user.email}</span> · Güncel plan:{' '}
                <span className="text-gold">{activeTier === 'pro' ? 'Pro' : 'Ücretsiz'}</span>
              </>
            ) : (
              'Giriş yapmadan paketleri inceleyebilirsin. Pro aktivasyonu için önce hesabına giriş yapman gerekir.'
            )}
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-[#6c3438] bg-[#271317] px-4 py-3 text-[12px] text-[#f1a2a2]">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-[12px] text-emerald-200">
              {notice}
            </div>
          ) : null}

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                activeTier={activeTier}
                busyPlanId={busyPlanId === plan.id ? plan.id : ''}
                onActivate={activatePlan}
                plan={plan}
              />
            ))}
          </div>

          {/* Feature comparison table */}
          <ComparisonTable />
        </div>
      </div>
    </AppShell>
  );
}
