'use client';

import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'kd:onboarding:v1';

const FAMILY_OPTIONS = ['Çiçeksi', 'Odunsu', 'Oryantal', 'Taze', 'Gourmand'] as const;
const BUDGET_OPTIONS = ['300TL altı', '300-800TL', '800-2000TL', '2000TL+'] as const;

type FamilyOption = (typeof FAMILY_OPTIONS)[number];
type BudgetOption = (typeof BUDGET_OPTIONS)[number];

interface OnboardingState {
  family: FamilyOption | '';
  budget: BudgetOption | '';
}

function StepChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-[11px] font-mono uppercase tracking-[.08em] transition-colors ${
        active
          ? 'border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold'
          : 'border-white/[.08] text-muted hover:border-[var(--gold-line)] hover:text-cream'
      }`}
    >
      {label}
    </button>
  );
}

export function OnboardingWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [state, setState] = useState<OnboardingState>({ family: '', budget: '' });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    setOpen(!saved);
  }, []);

  const canContinue = useMemo(() => {
    if (step === 1) return Boolean(state.family);
    if (step === 2) return Boolean(state.budget);
    return true;
  }, [state.budget, state.family, step]);

  function persistAndClose(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...state,
          completedAt: new Date().toISOString(),
        }),
      );
      document.getElementById('hero-analysis')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/65 px-5 py-8 backdrop-blur-md">
      <div className="mx-auto max-w-[620px] rounded-[28px] border border-white/[.08] bg-[var(--bg-card)] p-6 shadow-[0_30px_80px_rgba(0,0,0,.45)] md:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-[10px] font-mono uppercase tracking-[.16em] text-gold">İlk Kurulum</p>
            <h2 className="text-[2rem] font-semibold text-cream">Koku profilini hızlı ayarlayalım.</h2>
          </div>
          <span className="rounded-full border border-white/[.08] px-3 py-1 text-[10px] font-mono uppercase tracking-[.08em] text-muted">
            {step}/3
          </span>
        </div>

        {step === 1 ? (
          <div className="space-y-5">
            <div>
              <p className="mb-3 text-[12px] font-mono uppercase tracking-[.12em] text-muted">Favori koku ailen?</p>
              <div className="flex flex-wrap gap-2">
                {FAMILY_OPTIONS.map((item) => (
                  <StepChip
                    key={item}
                    active={state.family === item}
                    label={item}
                    onClick={() => setState((prev) => ({ ...prev, family: item }))}
                  />
                ))}
              </div>
            </div>
            <p className="text-[13px] text-muted">Bu seçim, ilk önerileri daha hızlı doğru yöne çekmek için kullanılır.</p>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div>
              <p className="mb-3 text-[12px] font-mono uppercase tracking-[.12em] text-muted">Bütçe bandın?</p>
              <div className="flex flex-wrap gap-2">
                {BUDGET_OPTIONS.map((item) => (
                  <StepChip
                    key={item}
                    active={state.budget === item}
                    label={item}
                    onClick={() => setState((prev) => ({ ...prev, budget: item }))}
                  />
                ))}
              </div>
            </div>
            <p className="text-[13px] text-muted">Önerilerde gereksiz gürültüyü azaltmak için bu bandı referans alacağız.</p>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <p className="text-[12px] font-mono uppercase tracking-[.12em] text-muted">İlk analizini yapalım!</p>
            <div className="space-y-3 rounded-2xl border border-white/[.08] bg-black/10 p-5">
              <p className="text-[13px] text-muted">
                Seçilen profil:
                <span className="text-cream"> {state.family || 'Genel'}</span>
              </p>
              <p className="text-[13px] text-muted">
                Bütçe odağı:
                <span className="text-cream"> {state.budget || 'Açık'}</span>
              </p>
            </div>
            <p className="text-[13px] text-muted">Şimdi fotoğraf, metin veya nota listesiyle ilk analizini başlatabilirsin.</p>
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => (step === 1 ? persistAndClose() : setStep((prev) => Math.max(1, prev - 1)))}
            className="rounded-xl border border-white/[.08] px-4 py-3 text-[11px] font-mono uppercase tracking-[.08em] text-muted transition-colors hover:text-cream"
          >
            {step === 1 ? 'Şimdilik Geç' : 'Geri'}
          </button>

          {step < 3 ? (
            <button
              type="button"
              disabled={!canContinue}
              onClick={() => setStep((prev) => Math.min(3, prev + 1))}
              className={`rounded-xl px-5 py-3 text-[11px] font-mono uppercase tracking-[.1em] transition-colors ${
                canContinue ? 'bg-gold text-bg hover:bg-[#d8b676]' : 'border border-white/[.08] bg-white/[.04] text-muted'
              }`}
            >
              Devam
            </button>
          ) : (
            <button
              type="button"
              onClick={persistAndClose}
              className="rounded-xl bg-gold px-5 py-3 text-[11px] font-mono uppercase tracking-[.1em] text-bg transition-colors hover:bg-[#d8b676]"
            >
              İlk Analizini Başlat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
