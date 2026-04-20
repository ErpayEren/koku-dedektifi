'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="tr">
      <body style={{ background: '#0A0A0A', color: '#E8DFC8', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Beklenmedik bir hata oluştu</h2>
          <button
            type="button"
            onClick={reset}
            style={{ background: '#C9A96E', color: '#0A0A0A', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: 600, cursor: 'pointer' }}
          >
            Tekrar Dene
          </button>
        </div>
      </body>
    </html>
  );
}
