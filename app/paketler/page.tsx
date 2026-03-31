'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';

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
  checkoutPlanId: string;
  checkoutStartedAt: string | null;
  cancelAtPeriodEnd: boolean;
}

interface BillingUser {
  id: string;
  email: string;
  name: string;
}

interface BillingResponse {
  provider: string;
  plans: BillingPlan[];
  entitlement: BillingEntitlement;
  user: BillingUser | null;
  devActivationAllowed: boolean;
}

interface CheckoutResponse {
  checkoutId: string;
  checkoutUrl: string;
  planId: string;
  provider: string;
}

const PLAN_COPY: Record<'free' | 'pro', { name: string; features: string[] }> = {
  free: {
    name: 'Ücretsiz',
    features: ['5 analiz/gün', 'Koku dolabı', 'Karşılaştırma'],
  },
  pro: {
    name: 'Pro',
    features: ['Sınırsız analiz', 'Katmanlama Lab', 'Barkod Tarayıcı', 'Cihazlar arası senkronizasyon', 'Öncelikli AI'],
  },
};

const DEFAULT_PLANS: BillingPlan[] = [
  {
    id: 'free',
    name: PLAN_COPY.free.name,
    price: 0,
    currency: 'TRY',
    interval: 'gun',
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
      name: PLAN_COPY[plan.id as 'free' | 'pro']?.name || plan.name,
      features: PLAN_COPY[plan.id as 'free' | 'pro']?.features || plan.features,
    }));
}

function PlanCard({
  activeTier,
  busyPlanId,
  onCheckout,
  plan,
}: {
  activeTier: 'free' | 'pro';
  busyPlanId: string;
  onCheckout: (planId: string) => Promise<void>;
  plan: BillingPlan;
}) {
  const isActive = activeTier === plan.id;
  const isBusy = busyPlanId === plan.id;

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

      <CardTitle>{plan.name}</CardTitle>
      <div className="mt-3">
        <p className="text-[2.6rem] font-bold leading-none text-cream">{formatPrice(plan)}</p>
        <p className="mt-2 text-[12px] text-muted">
          {plan.id === 'free' ? 'Başlangıç seviyesi' : 'Aylık premium erişim'}
        </p>
      </div>

      <ul className="mt-6 space-y-2.5">
        {plan.features.map((feature) => (
          <li key={`${plan.id}-${feature}`} className="flex items-start gap-2 text-[13px] text-cream/90">
            <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={plan.id !== 'pro' || isActive || isBusy}
        onClick={() => void onCheckout(plan.id)}
        className={`mt-7 w-full rounded-xl py-3 text-[11px] font-mono uppercase tracking-[.1em] transition-colors ${
          plan.id !== 'pro'
            ? 'border border-white/[.08] bg-white/[.04] text-muted'
            : isActive
              ? 'border border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold'
              : isBusy
                ? 'border border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold'
                : 'bg-gold text-bg hover:bg-[#d8b676]'
        }`}
      >
            {plan.id !== 'pro' ? 'Ücretsiz Başla' : isActive ? 'Pro Aktif' : isBusy ? 'Yönlendiriliyor...' : "Pro'ya Geç"}
      </button>
    </Card>
  );
}

export default function PricingPage() {
  const [data, setData] = useState<BillingResponse | null>(null);
  const [error, setError] = useState('');
  const [busyPlanId, setBusyPlanId] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/billing', {
          method: 'GET',
          credentials: 'include',
        });
        const payload = (await response.json().catch(() => null)) as BillingResponse | null;
        if (!response.ok || !payload) {
          throw new Error(
            payload && 'error' in payload
              ? String((payload as { error?: string }).error || 'Paketler yuklenemedi.')
              : 'Paketler yuklenemedi.',
          );
        }
        setData(payload);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Paketler yuklenemedi.');
      }
    })();
  }, []);

  const plans = useMemo(() => normalizePlans(data?.plans), [data?.plans]);
  const activeTier = data?.entitlement?.tier === 'pro' ? 'pro' : 'free';

  async function startCheckout(planId: string): Promise<void> {
    if (planId !== 'pro') return;
    setBusyPlanId(planId);
    setError('');

    try {
      const response = await fetch('/api/billing', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start_checkout',
          planId: 'pro',
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | CheckoutResponse
        | { error?: string }
        | null;
      if (!response.ok || !payload || !('checkoutUrl' in payload) || typeof payload.checkoutUrl !== 'string') {
        throw new Error(
          payload && typeof payload === 'object' && 'error' in payload
            ? String(payload.error || 'Checkout baslatilamadi.')
            : 'Checkout baslatilamadi.',
        );
      }

      window.location.href = payload.checkoutUrl;
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout baslatilamadi.');
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
            Koku keşfini ihtiyacına göre
            <br />
            <span className="text-gold">ücretsiz başlat, Pro ile derinleştir.</span>
          </h1>

          <p className="mt-4 max-w-[620px] text-[13px] leading-relaxed text-muted">
            Ücretsiz planda günlük analiz hakkın, dolabın ve karşılaştırma akışın hazır. Pro ile Katmanlama Lab,
            Barkod Tarayıcı, öncelikli AI ve cihazlar arası senkronizasyon açılır.
          </p>

          <div className="mt-6 rounded-2xl border border-white/[.08] bg-black/10 px-4 py-3 text-[12px] text-muted">
            {data?.user ? (
              <>
                Aktif kullanıcı: <span className="text-cream">{data.user.name || data.user.email}</span> • Güncel plan:{' '}
                <span className="text-gold">{activeTier === 'pro' ? 'Pro' : 'Ücretsiz'}</span>
              </>
            ) : (
              'Giriş yapmadan da paketleri inceleyebilirsin. Checkout adımında hesabınla eşleştirilir.'
            )}
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-[#6c3438] bg-[#271317] px-4 py-3 text-[12px] text-[#f1a2a2]">
              {error}
            </div>
          ) : null}

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                activeTier={activeTier}
                busyPlanId={busyPlanId}
                onCheckout={startCheckout}
                plan={plan}
              />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
