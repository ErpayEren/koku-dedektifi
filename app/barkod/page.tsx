'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { AppShell } from '@/components/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AnalysisResults } from '@/components/AnalysisResults';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { analyzeText, lookupBarcode, readableError } from '@/lib/client/api';
import { useToastSync } from '@/lib/client/useToastSync';
import type { AnalysisResult } from '@/lib/client/types';
import { useUserStore } from '@/lib/store/userStore';

interface BarcodeLookupResult {
  found: boolean;
  perfume: string;
  family: string;
  occasion: string;
  season: string[];
  message: string;
}

export default function BarkodPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [code, setCode] = useState('');
  const [manualName, setManualName] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [error, setError] = useState('');
  const [lookupResult, setLookupResult] = useState<BarcodeLookupResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isPro = useUserStore((state) => state.isPro);
  const dailyLimit = useUserStore((state) => state.dailyLimit);
  const dailyUsed = useUserStore((state) => state.dailyUsed);
  const incrementUsage = useUserStore((state) => state.incrementUsage);

  useToastSync({ error: error || cameraError });

  useEffect(() => {
    return () => stopCamera();
  }, []);

  function stopCamera(): void {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraOpen(false);
  }

  async function runAnalyzeByName(name: string): Promise<void> {
    if (dailyLimit !== Number.POSITIVE_INFINITY && dailyUsed >= dailyLimit) {
      setError('Bugünkü ücretsiz analiz limitine ulaştın.');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    try {
      const result = await analyzeText(name, isPro);
      setAnalysis(result);
      incrementUsage();
    } catch (errorValue) {
      setError(readableError(errorValue));
      setAnalysis(null);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function runLookup(nextCode?: string): Promise<void> {
    const finalCode = (nextCode || code).replace(/[^0-9]/g, '');
    if (finalCode.length < 8) return;

    setLoading(true);
    setError('');
    setLookupResult(null);
    setAnalysis(null);

    try {
      const response = await lookupBarcode(finalCode);
      setCode(finalCode);
      setLookupResult(response);

      if (response.found && response.perfume) {
        await runAnalyzeByName(response.perfume);
      } else {
        setManualName('');
      }
    } catch (lookupError) {
      setError(readableError(lookupError));
      setLookupResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function startCamera(): Promise<void> {
    setCameraError('');
    setError('');

    if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
      setCameraError('Kamera bu tarayıcıda desteklenmiyor.');
      return;
    }

    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      setCameraOpen(true);
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, scanError) => {
        if (result?.getText()) {
          stopCamera();
          void runLookup(result.getText());
          return;
        }

        if (scanError && !String(scanError).includes('NotFoundException')) {
          setCameraError(readableError(scanError));
        }
      });
      controlsRef.current = controls;
    } catch (mediaError) {
      stopCamera();
      setCameraError(readableError(mediaError));
    }
  }

  return (
    <AppShell>
      <ErrorBoundary>
        <TopBar title="Barkod Tara" />
        <div className="px-5 py-8 md:px-12">
          <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
            <Card className="h-fit p-5 md:p-6 hover-lift">
              <CardTitle>Barkod Tara</CardTitle>
              <label className="mb-1.5 block text-[11px] text-muted">Barkod (manuel)</label>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ''))}
                className="w-full rounded-xl border border-white/[.08] bg-transparent p-3.5 text-[15px] text-cream outline-none focus:border-[var(--gold-line)]"
                placeholder="3348901520196"
                inputMode="numeric"
              />

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void runLookup()}
                  disabled={loading || code.length < 8}
                  className={`flex-1 rounded-xl py-3 text-[11px] font-mono uppercase tracking-[.1em] transition-colors ${
                    loading || code.length < 8
                      ? 'border border-white/[.08] bg-white/[.06] text-muted'
                      : 'bg-gold text-bg hover:bg-[#d8b676]'
                  }`}
                >
                  {loading ? 'Sorgulanıyor...' : 'Barkodu ara'}
                </button>

                <button
                  type="button"
                  onClick={() => void (cameraOpen ? Promise.resolve(stopCamera()) : startCamera())}
                  className="flex-1 rounded-xl border border-[var(--gold-line)] bg-[var(--gold-dim)] px-4 py-3 text-[11px] font-mono uppercase tracking-[.1em] text-gold transition-colors hover:bg-gold hover:text-bg"
                >
                  {cameraOpen ? 'Kamerayı kapat' : 'Kamerayı aç'}
                </button>
              </div>

              {cameraOpen ? (
                <div className="mt-5 overflow-hidden rounded-2xl border border-white/[.08] bg-black/25">
                  <video ref={videoRef} className="aspect-[4/3] w-full object-cover" muted playsInline />
                </div>
              ) : null}

              {lookupResult && !lookupResult.found ? (
                <div className="mt-5 rounded-[20px] border border-white/[.08] bg-white/[.03] p-4">
                  <p className="text-[13px] leading-relaxed text-cream/82">{lookupResult.message}</p>
                  <input
                    value={manualName}
                    onChange={(event) => setManualName(event.target.value)}
                    className="mt-4 w-full rounded-xl border border-white/[.08] bg-transparent p-3 text-cream outline-none focus:border-[var(--gold-line)]"
                    placeholder="Parfüm adını manuel gir"
                  />
                  <button
                    type="button"
                    onClick={() => void runAnalyzeByName(manualName.trim())}
                    disabled={!manualName.trim() || isAnalyzing}
                    className={`mt-3 w-full rounded-xl py-3 text-[11px] font-mono uppercase tracking-[.1em] transition-colors ${
                      !manualName.trim() || isAnalyzing
                        ? 'border border-white/[.08] bg-white/[.06] text-muted'
                        : 'bg-gold text-bg hover:bg-[#d8b676]'
                    }`}
                  >
                    {isAnalyzing ? 'Analiz ediliyor...' : 'Manuel isimle analiz et'}
                  </button>
                </div>
              ) : null}
            </Card>

            {loading || isAnalyzing ? (
              <SkeletonCard lines={4} className="h-full" />
            ) : (
              <Card className="p-5 md:p-6 hover-lift">
                <CardTitle>Barkod Sonucu</CardTitle>
                {!lookupResult ? (
                  <p className="text-[13px] text-muted">
                    Barkod araması tamamlandığında eşleşen parfüm bulunursa analiz otomatik başlar. Bulunamazsa manuel girişe yönlendirilirsin.
                  </p>
                ) : lookupResult.found ? (
                  <div>
                    <p className="text-[2rem] font-semibold leading-[1.05] text-cream">{lookupResult.perfume}</p>
                    <p className="mt-2 text-[12px] text-muted">
                      {lookupResult.family || 'Aromatik'} · {lookupResult.occasion || 'Genel kullanım'}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {lookupResult.season.map((season) => (
                        <span
                          key={season}
                          className="rounded-full border border-white/[.08] px-2.5 py-1 text-[10px] font-mono uppercase tracking-[.08em] text-muted"
                        >
                          {season}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] text-muted">{lookupResult.message}</p>
                )}
              </Card>
            )}
          </div>
        </div>

        {analysis || isAnalyzing ? (
          <AnalysisResults
            result={analysis}
            isAnalyzing={isAnalyzing}
            onAnalyzeSimilar={(name) => void runAnalyzeByName(name)}
          />
        ) : null}
      </ErrorBoundary>
    </AppShell>
  );
}
