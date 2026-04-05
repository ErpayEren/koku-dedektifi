'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useProModalStore } from '@/lib/store/proModalStore';

const BASE_BENEFITS = ['Sınırsız analiz', 'Tam molekül analizi', 'Sınırsız dolap'];

function buildFeatureHighlight(featureName: string): string {
  const lower = featureName.toLowerCase();
  if (lower.includes('karşılaştır')) return 'Karşılaştırma analizi';
  if (lower.includes('katman')) return 'Katmanlama analizi';
  if (lower.includes('nota')) return 'Nota Avcısı araması';
  if (lower.includes('barkod')) return 'Barkod ve kamera araması';
  if (lower.includes('dolap')) return 'Sınırsız dolap';
  if (lower.includes('analiz')) return 'Sınırsız günlük analiz';
  return featureName;
}

function toneClasses(featureName: string): string {
  const lower = featureName.toLowerCase();
  if (lower.includes('karşılaştır') || lower.includes('katman')) {
    return 'border-[var(--color-purple-dim)] bg-[var(--color-purple-glow)] text-[var(--color-purple)]';
  }
  if (lower.includes('barkod') || lower.includes('nota')) {
    return 'border-[var(--color-teal-dim)] bg-[rgba(45,212,191,0.12)] text-[var(--color-teal)]';
  }
  return 'border-[var(--gold-line)] bg-[var(--gold-dim)] text-gold';
}

export function ProModal() {
  const router = useRouter();
  const { open, featureName, closeModal } = useProModalStore();

  const highlightedFeature = useMemo(() => buildFeatureHighlight(featureName), [featureName]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Pro modal arkaplanını kapat"
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md"
        onClick={closeModal}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-[520px] overflow-hidden rounded-[28px] border border-[var(--gold-line)] bg-[linear-gradient(180deg,rgba(245,158,11,0.08),rgba(13,13,18,0.98))] p-6 shadow-[0_0_40px_rgba(245,158,11,0.18),0_24px_60px_rgba(0,0,0,0.45)]">
          <button
            type="button"
            onClick={closeModal}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 transition-colors hover:text-white"
            aria-label="Kapat"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M2 2l8 8M10 2 2 10" />
            </svg>
          </button>

          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gold/80">✦ Bu özellik Pro&apos;ya özel</p>
          <h3 className="mt-3 text-[2rem] font-semibold leading-[1.02] text-cream">{highlightedFeature}</h3>
          <p className="mt-4 text-[14px] leading-relaxed text-cream/84">
            {highlightedFeature} için Pro gerekiyor. Ürün olgunlaşana kadar Pro tek tıkla aktif oluyor.
          </p>

          <div className="mt-5 grid gap-2">
            {[...BASE_BENEFITS, highlightedFeature].map((item, index, list) => {
              const isHighlight = index === list.length - 1;
              return (
                <div
                  key={`${item}-${index}`}
                  className={`flex items-start gap-2 rounded-2xl border px-4 py-3 ${
                    isHighlight ? toneClasses(featureName) : 'border-white/8 bg-white/[.03] text-cream/88'
                  }`}
                >
                  <span
                    className={`mt-1 inline-flex h-2 w-2 rounded-full ${
                      isHighlight
                        ? 'bg-current shadow-[0_0_10px_currentColor]'
                        : 'bg-gold shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                    }`}
                  />
                  <span className="text-[13px]">
                    {isHighlight ? `${item} vurgulu olarak açılır` : item}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                closeModal();
                router.push('/paketler');
              }}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-3.5 text-[11px] font-mono uppercase tracking-[0.14em] text-black shadow-[0_4px_20px_rgba(217,119,6,0.35)] transition-transform hover:scale-[1.01]"
            >
              Pro&apos;ya Geç - Ücretsiz
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-[11px] font-mono uppercase tracking-[0.14em] text-muted transition-colors hover:text-cream"
            >
              Belki Sonra
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
