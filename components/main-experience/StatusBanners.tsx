'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MainStatusCard } from './status-types';

interface StatusBannersProps {
  error: string;
  notice: string;
  statusCard: MainStatusCard | null;
  onRetry: () => void;
  onOpenNotesMode: () => void;
  onOpenPackages: () => void;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 pb-3 md:px-12">
      <div className="mx-auto max-w-[920px] rounded-2xl border border-[var(--gold-line)]/45 bg-[color:var(--bg-card)]/85 px-4 py-4 backdrop-blur-sm">
        {children}
      </div>
    </div>
  );
}

export function StatusBanners({
  error,
  notice,
  statusCard,
  onRetry,
  onOpenNotesMode,
  onOpenPackages,
}: StatusBannersProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!statusCard || statusCard.kind !== 'rate-limit') {
      setSecondsLeft(0);
      return;
    }

    const update = () => {
      const delta = Math.max(0, Math.ceil((statusCard.untilMs - Date.now()) / 1000));
      setSecondsLeft(delta);
    };

    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [statusCard]);

  const apiErrorState = useMemo(() => {
    if (!statusCard || statusCard.kind !== 'api-error') return null;
    return {
      canRetry: statusCard.retryCount < statusCard.retryLimit,
      label: `${statusCard.retryCount}/${statusCard.retryLimit}`,
    };
  }, [statusCard]);

  if (statusCard?.kind === 'not-found') {
    return (
      <Shell>
        <p className="text-[10px] font-mono uppercase tracking-[.16em] text-gold">Parfüm bulunamadı</p>
        <h3 className="mt-2 text-[1.05rem] font-semibold text-cream">Bu kokuyu tanıyamadık</h3>
        <p className="mt-2 text-[13px] text-muted">
          Veritabanında net bir eşleşme bulunamadı. Notaları kendin girersen çok daha doğru sonuç çıkarırız.
        </p>
        <button
          type="button"
          onClick={onOpenNotesMode}
          className="mt-4 inline-flex rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)] px-3 py-2 text-[10px] font-mono uppercase tracking-[.12em] text-gold transition-colors hover:bg-[var(--gold-dim)]/80"
        >
          Notaları kendin gir
        </button>
      </Shell>
    );
  }

  if (statusCard?.kind === 'api-error') {
    return (
      <Shell>
        <p className="text-[10px] font-mono uppercase tracking-[.16em] text-gold">Sunucu yoğunluğu</p>
        <h3 className="mt-2 text-[1.05rem] font-semibold text-cream">Analiz şu an yavaş, tekrar deneyelim</h3>
        <p className="mt-2 text-[13px] text-muted">{error || 'Geçici bir API gecikmesi tespit edildi.'}</p>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            disabled={!apiErrorState?.canRetry}
            className="inline-flex rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)] px-3 py-2 text-[10px] font-mono uppercase tracking-[.12em] text-gold transition-colors hover:bg-[var(--gold-dim)]/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tekrar dene
          </button>
          <span className="text-[11px] text-muted">Deneme: {apiErrorState?.label}</span>
        </div>
      </Shell>
    );
  }

  if (statusCard?.kind === 'daily-limit') {
    return (
      <Shell>
        <p className="text-[10px] font-mono uppercase tracking-[.16em] text-gold">Günlük limit</p>
        <h3 className="mt-2 text-[1.05rem] font-semibold text-cream">Bugünkü 3 analizini kullandın</h3>
        <p className="mt-2 text-[13px] text-muted">
          Ücretsiz plan yarın sıfırlanır. Hemen devam etmek istersen Pro ile sınırsız analiz açılır.
        </p>
        <button
          type="button"
          onClick={onOpenPackages}
          className="mt-4 inline-flex rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)] px-3 py-2 text-[10px] font-mono uppercase tracking-[.12em] text-gold transition-colors hover:bg-[var(--gold-dim)]/80"
        >
          Pro&apos;ya geç
        </button>
      </Shell>
    );
  }

  if (statusCard?.kind === 'rate-limit') {
    return (
      <Shell>
        <p className="text-[10px] font-mono uppercase tracking-[.16em] text-gold">Rate limit</p>
        <h3 className="mt-2 text-[1.05rem] font-semibold text-cream">Çok hızlı istek gönderildi</h3>
        <p className="mt-2 text-[13px] text-muted">
          {secondsLeft > 0
            ? `${secondsLeft} saniye sonra tekrar deneyebilirsin.`
            : 'Sayaç tamamlandı, tekrar deneyebilirsin.'}
        </p>
        <button
          type="button"
          onClick={onRetry}
          disabled={secondsLeft > 0}
          className="mt-4 inline-flex rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)] px-3 py-2 text-[10px] font-mono uppercase tracking-[.12em] text-gold transition-colors hover:bg-[var(--gold-dim)]/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {secondsLeft > 0 ? `Bekle (${secondsLeft})` : 'Tekrar dene'}
        </button>
      </Shell>
    );
  }

  return (
    <>
      {error ? (
        <div className="px-5 pb-3 md:px-12">
          <div className="mx-auto max-w-[920px] rounded-xl border border-[#623535] bg-[#2b1214] px-4 py-3 text-[12px] text-[#f1a2a2]">
            {error}
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className="px-5 pb-3 md:px-12">
          <div className="mx-auto max-w-[920px] rounded-xl border border-amber-500/30 bg-[linear-gradient(135deg,rgba(201,169,110,.18),rgba(17,37,32,.72))] px-4 py-3 text-[12px] text-[#efe3c2] shadow-[0_10px_30px_rgba(201,169,110,.08)]">
            {notice}
          </div>
        </div>
      ) : null}
    </>
  );
}
