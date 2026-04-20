'use client';

import * as Sentry from '@sentry/nextjs';

type AnalysisMode = 'photo' | 'text' | 'notes' | 'barcode';

export const analytics = {
  analysisStarted(mode: AnalysisMode): void {
    Sentry.addBreadcrumb({ category: 'analysis', message: `analysis_started:${mode}`, level: 'info' });
    captureEvent('analysis_started', { mode });
  },

  analysisCompleted(opts: {
    mode: AnalysisMode;
    cached: boolean;
    confidenceScore: number;
    latencyMs: number;
  }): void {
    Sentry.addBreadcrumb({ category: 'analysis', message: 'analysis_completed', level: 'info', data: opts });
    captureEvent('analysis_completed', opts);
  },

  analysisFailed(opts: { mode: AnalysisMode; errorCode: string; retried: boolean }): void {
    Sentry.addBreadcrumb({ category: 'analysis', message: 'analysis_failed', level: 'warning', data: opts });
    captureEvent('analysis_failed', opts);
  },

  proClicked(source: string): void {
    Sentry.addBreadcrumb({ category: 'monetization', message: `pro_clicked:${source}`, level: 'info' });
    captureEvent('pro_clicked', { source });
  },

  shareClicked(medium: 'native' | 'web' | 'clipboard'): void {
    Sentry.addBreadcrumb({ category: 'engagement', message: `share_clicked:${medium}`, level: 'info' });
    captureEvent('share_clicked', { medium });
  },

  barcodeScanned(found: boolean): void {
    Sentry.addBreadcrumb({ category: 'barcode', message: `barcode_scanned:${found ? 'found' : 'not_found'}`, level: 'info' });
    captureEvent('barcode_scanned', { found });
  },
};

function captureEvent(name: string, data: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    Sentry.captureEvent({
      message: name,
      level: 'info',
      tags: { event_name: name },
      extra: data,
    });
  } catch {
    // analytics must not throw
  }
}
