'use client';

import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { lookupBarcode, readableError } from '@/lib/client/api';
import { UI } from '@/lib/strings';

export default function BarkodPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    found: boolean;
    perfume: string;
    family: string;
    occasion: string;
    season: string[];
    message: string;
  } | null>(null);

  async function runLookup(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const response = await lookupBarcode(code);
      setResult(response);
    } catch (err) {
      setError(readableError(err));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <TopBar title={UI.barcodeScanner} />
      <div className="px-5 md:px-12 py-8">
        <div className="max-w-[940px] mx-auto grid grid-cols-1 md:grid-cols-[360px_1fr] gap-5">
          <Card className="p-5 md:p-6 h-fit hover-lift">
            <CardTitle>{UI.barcodeScanner}</CardTitle>
            <label className="text-[11px] text-muted block mb-1.5">{UI.barcodeManual}</label>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ''))}
              className="w-full rounded-xl border border-white/[.08] bg-transparent p-3.5 text-[15px] text-cream outline-none focus:border-[var(--gold-line)]"
              placeholder="3348901520196"
              inputMode="numeric"
            />
            <button
              type="button"
              onClick={runLookup}
              disabled={loading || code.length < 8}
              className={`mt-5 w-full rounded-xl py-3 text-[11px] font-mono uppercase tracking-[.1em] transition-colors
                ${
                  loading || code.length < 8
                    ? 'bg-white/[.06] text-muted border border-white/[.08]'
                    : 'bg-gold text-bg hover:bg-[#d8b676]'
                }`}
            >
              {loading ? 'Sorgulanıyor…' : UI.barcodeSearch}
            </button>
            {error ? <p className="mt-4 text-[12px] text-[#f1a2a2]">{error}</p> : null}
          </Card>

          <Card className="p-5 md:p-6 hover-lift">
            <CardTitle>Barkod Sonucu</CardTitle>
            {!result ? (
              <p className="text-[13px] text-muted">Bir barkod girip aramayı çalıştırdığında eşleşme sonucu burada listelenir.</p>
            ) : result.found ? (
              <div className="anim-up">
                <p className="font-display italic text-[2rem] text-cream leading-[1.05]">{result.perfume}</p>
                <p className="text-[12px] text-muted mt-2">{result.family} • {result.occasion || 'Genel kullanım'}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {result.season.map((season) => (
                    <span key={season} className="text-[10px] px-2 py-1 rounded-full border border-white/[.08] text-muted">
                      {season}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-muted">{result.message || 'Bu barkod katalogda bulunamadı.'}</p>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

