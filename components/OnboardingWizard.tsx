'use client';

import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'kd:onboarding:v1';

const FAMILY_OPTIONS = ['Ciceksi', 'Odunsu', 'Oryantal', 'Taze', 'Gourmand'] as const;
const BUDGET_OPTIONS = ['300TL alti', '300-800TL', '800-2000TL', '2000TL+'] as const;

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
      className={`rounded-full px-4 py-2 text-[11px] font-mono uppercase tracking-[.08em] transition-colors border ${
        active
          ? 'border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold'
          : 'border-white/[.08] text-muted hover:text-cream hover:border-[var(--gold-line)]'
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
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md px-5 py-8">
      <div className="mx-auto max-w-[620px] rounded-[28px] border border-white/[.08] bg-[var(--bg-card)] p-6 md:p-8 shadow-[0_30px_80px_rgba(0,0,0,.45)]">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[.16em] text-gold mb-2">Ilk Kurulum</p>
            <h2 className="font-display italic text-[2rem] text-cream">Koku profilini hizla ayarlayalim.</h2>
          </div>
          <span className="rounded-full border border-white/[.08] px-3 py-1 text-[10px] font-mono uppercase tracking-[.08em] text-muted">
            {step}/3
          </span>
        </div>

        {step === 1 ? (
          <div className="space-y-5">
            <div>
              <p className="text-[12px] font-mono uppercase tracking-[.12em] text-muted mb-3">
                Favori koku ailen?
              </p>
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
            <p className="text-[13px] text-muted">
              Bu secim, ilk onerileri daha hizli dogru yone cekmek icin kullanilir.
            </p>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div>
              <p className="text-[12px] font-mono uppercase tracking-[.12em] text-muted mb-3">Butce bandin?</p>
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
            <p className="text-[13px] text-muted">
              Onerilerde gereksiz gurultuyu azaltmak icin bu bandi referans alacagiz.
            </p>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <p className="text-[12px] font-mono uppercase tracking-[.12em] text-muted">Ilk analizini yapalim!</p>
            <div className="rounded-2xl border border-white/[.08] bg-black/10 p-5 space-y-3">
              <p className="text-[13px] text-muted">
                Secilen profil:
                <span className="text-cream"> {state.family || 'Genel'}</span>
              </p>
              <p className="text-[13px] text-muted">
                Butce odagi:
                <span className="text-cream"> {state.budget || 'Acik'}</span>
              </p>
            </div>
            <p className="text-[13px] text-muted">
              Simdi fotograf, metin veya nota listesiyle ilk analizini baslatabilirsin.
            </p>
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => (step === 1 ? persistAndClose() : setStep((prev) => Math.max(1, prev - 1)))}
            className="rounded-xl border border-white/[.08] px-4 py-3 text-[11px] font-mono uppercase tracking-[.08em] text-muted hover:text-cream transition-colors"
          >
            {step === 1 ? 'Simdilik Gec' : 'Geri'}
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
              className="rounded-xl bg-gold px-5 py-3 text-[11px] font-mono uppercase tracking-[.1em] text-bg hover:bg-[#d8b676] transition-colors"
            >
              Ilk Analizini Baslat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
