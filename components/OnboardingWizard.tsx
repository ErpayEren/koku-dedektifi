'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { setOnboardingPreferences, hasCompletedOnboarding } from '@/lib/client/storage';
import type {
  OnboardingIntensity,
  OnboardingPreferences,
  OnboardingSeason,
  OnboardingStance,
} from '@/lib/client/types';
import { MoleculeVisual } from './MoleculeVisual';

const SEASONS: OnboardingSeason[] = ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış'];
const STANCES: OnboardingStance[] = ['Sakin', 'Çarpıcı', 'Sofistike'];
const INTENSITIES: OnboardingIntensity[] = ['Hafif', 'Orta', 'Yoğun'];

function ChoiceChip({
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
      className={`rounded-full border px-4 py-2 text-[11px] font-mono uppercase tracking-[0.08em] transition-all ${
        active
          ? 'border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold shadow-[0_0_16px_rgba(201,169,110,.12)]'
          : 'border-white/[.08] bg-white/[.03] text-muted hover:border-white/[.14] hover:text-cream'
      }`}
    >
      {label}
    </button>
  );
}

function PyramidPreview() {
  return (
    <div className="rounded-[24px] border border-white/[.08] bg-white/[.03] p-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'İlk dokunuş', notes: 'Bergamot • Neroli • Biber' },
          { label: 'Kalp', notes: 'Yasemin • İris • Sedir' },
          { label: 'Kalan iz', notes: 'Ambroxide • Misk • Vanilya' },
        ].map((tier) => (
          <div key={tier.label} className="rounded-2xl border border-white/[.06] bg-black/10 p-3">
            <p className="mb-2 text-[10px] font-mono uppercase tracking-[.12em] text-gold/80">{tier.label}</p>
            <p className="text-[12px] leading-relaxed text-cream/90">{tier.notes}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OnboardingWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<Omit<OnboardingPreferences, 'completedAt'>>({
    season: '',
    stance: '',
    intensity: '',
  });

  useEffect(() => {
    setOpen(!hasCompletedOnboarding());
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const canFinish = useMemo(
    () => Boolean(prefs.season && prefs.stance && prefs.intensity),
    [prefs.intensity, prefs.season, prefs.stance],
  );

  function closeWizard() {
    setOpen(false);
    document.getElementById('hero-analysis')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function dismissWizard() {
    setOnboardingPreferences({
      season: '',
      stance: '',
      intensity: '',
      completedAt: new Date().toISOString(),
    });
    closeWizard();
  }

  function persistPreferences() {
    if (!canFinish) return;
    setOnboardingPreferences({
      ...prefs,
      completedAt: new Date().toISOString(),
    });
    closeWizard();
  }

  function handleDragEnd(offsetX: number) {
    if (offsetX <= -60 && step < 2) {
      setStep((current) => current + 1);
    }
    if (offsetX >= 60 && step > 0) {
      setStep((current) => current - 1);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 px-4 py-6 backdrop-blur-md md:px-6 md:py-8">
      <div className="mx-auto flex h-full max-w-[740px] items-center justify-center">
        <div className="w-full overflow-hidden rounded-[32px] border border-white/[.08] bg-[var(--bg-card)] shadow-[0_30px_90px_rgba(0,0,0,.5)]">
          <div className="flex items-center justify-between border-b border-white/[.06] px-5 py-4 md:px-8 md:py-5">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[.16em] text-gold/80">Koku Dedektifi</p>
              <h2 className="mt-1 text-[1.5rem] font-semibold text-cream md:text-[1.85rem]">
                Parfümünü moleküler düzeyde anlayan tek uygulama.
              </h2>
            </div>
            <button
              type="button"
              onClick={dismissWizard}
              className="rounded-full border border-white/[.08] px-3 py-1.5 text-[10px] font-mono uppercase tracking-[.08em] text-muted transition-colors hover:text-cream"
            >
              Geç
            </button>
          </div>

          <div className="px-5 pb-5 pt-4 md:px-8 md:pb-8 md:pt-6">
            <div className="mb-6 flex items-center gap-2">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    dot === step ? 'w-8 bg-gold' : 'w-1.5 bg-white/[.18]'
                  }`}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => handleDragEnd(info.offset.x)}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="min-h-[430px]"
              >
                {step === 0 ? (
                  <div className="space-y-5">
                    <div className="max-w-[480px]">
                      <p className="text-[11px] font-mono uppercase tracking-[.16em] text-gold/75">Ekran 1</p>
                      <h3 className="mt-2 text-[2rem] font-semibold leading-[1.05] text-cream md:text-[2.4rem]">
                        Koku artık görünür.
                      </h3>
                      <p className="mt-3 text-[15px] leading-relaxed text-muted">
                        Bir parfümü fotoğrafla ve moleküler yapısını keşfet. Artık sadece notaları değil, imzayı taşıyan
                        yapıları da göreceksin.
                      </p>
                    </div>

                    <MoleculeVisual
                      name="Ambroxide"
                      smiles="CC1(C)CCC2(C(C1)CCC3C2CC=C4C3(CCCC4(C)C)O)C"
                      formula="C16H28O"
                    />
                  </div>
                ) : null}

                {step === 1 ? (
                  <div className="space-y-5">
                    <div className="max-w-[480px]">
                      <p className="text-[11px] font-mono uppercase tracking-[.16em] text-gold/75">Ekran 2</p>
                      <h3 className="mt-2 text-[2rem] font-semibold leading-[1.05] text-cream md:text-[2.4rem]">
                        Notandan Moleküle.
                      </h3>
                      <p className="mt-3 text-[15px] leading-relaxed text-muted">
                        İlk dokunuştan kalan ize kadar her adımı okuyup, hangi fazda hangi moleküler karakterin öne
                        çıktığını gör.
                      </p>
                    </div>

                    <PyramidPreview />
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="space-y-6">
                    <div className="max-w-[480px]">
                      <p className="text-[11px] font-mono uppercase tracking-[.16em] text-gold/75">Ekran 3</p>
                      <h3 className="mt-2 text-[2rem] font-semibold leading-[1.05] text-cream md:text-[2.4rem]">
                        Sana özel koku profili.
                      </h3>
                      <p className="mt-3 text-[15px] leading-relaxed text-muted">
                        Bu üç seçim, analiz sonucunda gördüğün sana uyum skorunu kişisel zevkine göre ayarlayacak.
                      </p>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <p className="mb-3 text-[11px] font-mono uppercase tracking-[.12em] text-muted">Mevsim?</p>
                        <div className="flex flex-wrap gap-2">
                          {SEASONS.map((item) => (
                            <ChoiceChip
                              key={item}
                              active={prefs.season === item}
                              label={item}
                              onClick={() => setPrefs((current) => ({ ...current, season: item }))}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="mb-3 text-[11px] font-mono uppercase tracking-[.12em] text-muted">Duruş?</p>
                        <div className="flex flex-wrap gap-2">
                          {STANCES.map((item) => (
                            <ChoiceChip
                              key={item}
                              active={prefs.stance === item}
                              label={item}
                              onClick={() => setPrefs((current) => ({ ...current, stance: item }))}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="mb-3 text-[11px] font-mono uppercase tracking-[.12em] text-muted">Yoğunluk?</p>
                        <div className="flex flex-wrap gap-2">
                          {INTENSITIES.map((item) => (
                            <ChoiceChip
                              key={item}
                              active={prefs.intensity === item}
                              label={item}
                              onClick={() => setPrefs((current) => ({ ...current, intensity: item }))}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => (step === 0 ? dismissWizard() : setStep((current) => current - 1))}
                className="rounded-xl border border-white/[.08] px-4 py-3 text-[11px] font-mono uppercase tracking-[.08em] text-muted transition-colors hover:text-cream"
              >
                {step === 0 ? 'Şimdilik geç' : 'Geri'}
              </button>

              {step < 2 ? (
                <button
                  type="button"
                  onClick={() => setStep((current) => current + 1)}
                  className="rounded-xl bg-gold px-5 py-3 text-[11px] font-mono uppercase tracking-[.1em] text-bg transition-colors hover:bg-[#d8b676]"
                >
                  Devam
                </button>
              ) : (
                <button
                  type="button"
                  onClick={persistPreferences}
                  disabled={!canFinish}
                  className={`rounded-xl px-5 py-3 text-[11px] font-mono uppercase tracking-[.1em] transition-colors ${
                    canFinish
                      ? 'bg-gold text-bg hover:bg-[#d8b676]'
                      : 'border border-white/[.08] bg-white/[.04] text-muted'
                  }`}
                >
                  İlk Analizini Başlat
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
