'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { AnalysisResults } from '@/components/AnalysisResults';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { AnalysisResult } from '@/lib/client/types';

interface Props {
  analysis: AnalysisResult;
  slug: string;
}

export function AnalysisSlugClient({ analysis, slug }: Props) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/analiz/${slug}`
      : `/analiz/${slug}`;

  const handleShare = useCallback(async () => {
    const title = analysis.brand
      ? `${analysis.brand} ${analysis.name} — Koku Dedektifi`
      : `${analysis.name} — Koku Dedektifi`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch {
        // User cancelled or not supported — fall through to copy
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silently fail
    }
  }, [shareUrl, analysis.brand, analysis.name]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: analysis.brand ? `${analysis.brand} ${analysis.name} Analizi` : `${analysis.name} Analizi`,
    description: analysis.description?.slice(0, 200),
    datePublished: analysis.createdAt,
    author: { '@type': 'Organization', name: 'Koku Dedektifi' },
    publisher: {
      '@type': 'Organization',
      name: 'Koku Dedektifi',
      logo: { '@type': 'ImageObject', url: '/icon.svg' },
    },
  };

  return (
    <AppShell>
      <ErrorBoundary>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <TopBar title={analysis.brand ? `${analysis.brand} ${analysis.name}` : analysis.name} />

        {/* Shared analysis banner */}
        <div className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[var(--gold-line)]/40 bg-[var(--gold-dim)]/10 px-4 py-3 sm:mx-6">
          <p className="text-[12px] text-cream/80">
            Bu analiz paylaşıldı.{' '}
            <Link href="/" className="text-gold underline-offset-2 hover:underline">
              Kendi parfümünü analiz et →
            </Link>
          </p>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="shrink-0 rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)]/15 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[.1em] text-gold transition-colors hover:bg-[var(--gold-dim)]/30"
          >
            {copied ? 'Kopyalandı!' : 'Paylaş'}
          </button>
        </div>

        <AnalysisResults
          result={analysis}
          isAnalyzing={false}
          onAnalyzeSimilar={(name) => {
            window.location.href = `/?q=${encodeURIComponent(name)}`;
          }}
        />

        {/* CTA */}
        <div className="mx-4 mb-8 mt-2 sm:mx-6">
          <Link
            href="/"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold py-4 text-[12px] font-mono uppercase tracking-[.14em] text-bg transition-colors hover:bg-[#d8b676]"
          >
            Kendi Parfümünü Analiz Et
          </Link>
        </div>
      </ErrorBoundary>
    </AppShell>
  );
}
