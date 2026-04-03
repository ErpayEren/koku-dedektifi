'use client';

import { useInstantProUpgrade } from '@/lib/client/useInstantProUpgrade';

interface UpgradePromptModalProps {
  open: boolean;
  title: string;
  body: string;
  featureBullets: string[];
  onClose: () => void;
}

export function UpgradePromptModal({
  open,
  title,
  body,
  featureBullets,
  onClose,
}: UpgradePromptModalProps) {
  const { activate, busy, error, clearError } = useInstantProUpgrade();

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Upgrade modal arkaplanını kapat"
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-[520px] overflow-hidden rounded-[28px] border border-[var(--gold-line)] bg-[linear-gradient(180deg,rgba(245,158,11,0.08),rgba(13,13,18,0.98))] p-6 shadow-[0_0_40px_rgba(245,158,11,0.18),0_24px_60px_rgba(0,0,0,0.45)]">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 transition-colors hover:text-white"
            aria-label="Kapat"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M2 2l8 8M10 2 2 10" />
            </svg>
          </button>

          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gold/80">Pro Duvarı</p>
          <h3 className="mt-3 text-[2rem] font-semibold leading-[1.02] text-cream">{title}</h3>
          <p className="mt-4 text-[14px] leading-relaxed text-cream/84">{body}</p>

          <div className="mt-5 grid gap-2">
            {featureBullets.map((item) => (
              <div key={item} className="flex items-start gap-2 rounded-2xl border border-white/8 bg-white/[.03] px-4 py-3">
                <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-gold shadow-[0_0_10px_rgba(245,158,11,0.4)]" />
                <span className="text-[13px] text-cream/88">{item}</span>
              </div>
            ))}
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-[#6c3438] bg-[#271317] px-4 py-3 text-[12px] text-[#f1a2a2]">
              {error}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                clearError();
                void activate().then((upgraded) => {
                  if (upgraded) onClose();
                });
              }}
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-3.5 text-[11px] font-mono uppercase tracking-[0.14em] text-black shadow-[0_4px_20px_rgba(217,119,6,0.35)] transition-transform hover:scale-[1.01] disabled:opacity-60"
            >
              {busy ? 'PRO AÇILIYOR...' : "PRO'YU AÇ →"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-[11px] font-mono uppercase tracking-[0.14em] text-muted transition-colors hover:text-cream"
            >
              Şimdilik Kapat
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
