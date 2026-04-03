'use client';

interface ShareAnalysisModalProps {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onInstagramShare: () => Promise<void>;
  onCopyLink: () => Promise<void>;
  onDownload: () => Promise<void>;
}

export function ShareAnalysisModal({
  open,
  busy,
  onClose,
  onInstagramShare,
  onCopyLink,
  onDownload,
}: ShareAnalysisModalProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Paylaşım paneli arka planını kapat"
        className="fixed inset-0 z-40 bg-black/65 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-[460px] rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(13,13,18,0.98))] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.45)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gold/80">Paylaşım Kartı</p>
              <h3 className="mt-3 text-[1.9rem] font-semibold leading-[1.02] text-cream">Sonucu paylaş</h3>
              <p className="mt-3 text-[13px] leading-relaxed text-cream/78">
                Instagram story oranında hazırlanmış analiz kartını paylaşabilir, linki kopyalayabilir ya da PNG
                indirebilirsin.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 transition-colors hover:text-white"
              aria-label="Kapat"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M2 2l8 8M10 2 2 10" />
              </svg>
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void onInstagramShare()}
              className="rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-4 text-left text-[12px] font-mono uppercase tracking-[0.12em] text-black shadow-[0_4px_18px_rgba(217,119,6,0.28)] transition-transform hover:scale-[1.01] disabled:opacity-60"
            >
              {busy ? 'Hazırlanıyor…' : "Instagram'da Paylaş"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onCopyLink()}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left text-[12px] font-mono uppercase tracking-[0.12em] text-cream/88 transition-colors hover:bg-white/8 disabled:opacity-60"
            >
              Linki Kopyala
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onDownload()}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left text-[12px] font-mono uppercase tracking-[0.12em] text-cream/88 transition-colors hover:bg-white/8 disabled:opacity-60"
            >
              PNG İndir
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
