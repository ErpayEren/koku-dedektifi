'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Render hatasi yakalandi.', error, errorInfo);
  }

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="px-5 md:px-12 py-10">
          <div className="max-w-[920px] mx-auto rounded-3xl border border-white/[.08] bg-[var(--bg-card)] p-8 md:p-10 text-center">
            <p className="text-[10px] font-mono uppercase tracking-[.14em] text-gold mb-4">Guvenli Mod</p>
            <h2 className="mb-3 text-[2rem] font-semibold text-cream">Bir sey yolunda gitmedi.</h2>
            <p className="text-[13px] text-muted max-w-[520px] mx-auto mb-6">
              Sayfa beklenmedik bir hata yasadi. Tek dokunusla yeniden yukleyip kaldigin yerden devam
              edebilirsin.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-xl bg-gold px-5 py-3 text-[11px] font-mono uppercase tracking-[.1em] text-bg hover:bg-[#d8b676] transition-colors"
            >
              Yeniden Dene
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
