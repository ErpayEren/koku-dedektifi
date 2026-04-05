'use client';

import { useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { useProGate } from '@/hooks/useProGate';
import { lookupBarcode, readableError } from '@/lib/client/api';
import { UI } from '@/lib/strings';

interface BarcodeLookupResult {
  found: boolean;
  perfume: string;
  family: string;
  occasion: string;
  season: string[];
  message: string;
}

interface BarcodeDetectionResult {
  rawValue?: string;
}

interface BarcodeDetectorOptions {
  formats?: string[];
}

interface BarcodeDetectorInstance {
  detect: (source: ImageBitmapSource) => Promise<BarcodeDetectionResult[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: BarcodeDetectorOptions): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

export default function BarkodPage() {
  const { requirePro } = useProGate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<BarcodeLookupResult | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const timerRef = useRef<number | null>(null);
  const scanningRef = useRef(false);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  function stopCamera(): void {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    scanningRef.current = false;
    setCameraOpen(false);
  }

  async function runLookup(nextCode?: string): Promise<void> {
    if (!requirePro('Barkod arama')) return;
    const finalCode = (nextCode || code).replace(/[^0-9]/g, '');
    if (finalCode.length < 8) return;

    setLoading(true);
    setError('');

    try {
      const response = await lookupBarcode(finalCode);
      setCode(finalCode);
      setResult(response);
    } catch (lookupError) {
      setError(readableError(lookupError));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function startCamera(): Promise<void> {
    if (!requirePro('Barkod kamerası')) return;
    setCameraError('');
    setError('');

    const Detector = window.BarcodeDetector;
    if (!Detector) {
      setCameraError('Kameranız bu tarayıcıda desteklenmiyor.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Kameranız bu tarayıcıda desteklenmiyor.');
      return;
    }

    try {
      const supportedFormats = (await Detector.getSupportedFormats?.().catch(() => [])) || [];
      const preferredFormats = ['ean_13', 'ean_8', 'code_128', 'qr_code'];
      const formats = supportedFormats.length
        ? preferredFormats.filter((format) => supportedFormats.includes(format))
        : preferredFormats;

      detectorRef.current = new Detector(formats.length ? { formats } : undefined);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
        },
      });

      streamRef.current = stream;
      setCameraOpen(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => null);
      }

      timerRef.current = window.setInterval(() => {
        if (scanningRef.current || !videoRef.current || !detectorRef.current) return;
        if (videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

        scanningRef.current = true;
        void detectorRef.current
          .detect(videoRef.current)
          .then(async (detections) => {
            const rawValue = detections.find((item) => typeof item.rawValue === 'string' && item.rawValue.trim())?.rawValue?.trim();
            if (!rawValue) return;

            stopCamera();
            await runLookup(rawValue);
          })
          .catch(() => null)
          .finally(() => {
            scanningRef.current = false;
          });
      }, 500);
    } catch (mediaError) {
      stopCamera();
      setCameraError(readableError(mediaError));
    }
  }

  return (
    <AppShell>
      <ErrorBoundary>
        <TopBar title={UI.barcodeScanner} />
        <div className="px-5 py-8 md:px-12">
          <div className="mx-auto grid max-w-[940px] grid-cols-1 gap-5 md:grid-cols-[380px_1fr]">
            <Card className="h-fit p-5 md:p-6 hover-lift">
              <CardTitle>{UI.barcodeScanner}</CardTitle>
              <label className="mb-1.5 block text-[11px] text-muted">{UI.barcodeManual}</label>
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
                  {loading ? 'Sorgulanıyor...' : UI.barcodeSearch}
                </button>

                <button
                  type="button"
                  onClick={() => void (cameraOpen ? Promise.resolve(stopCamera()) : startCamera())}
                  className="flex-1 rounded-xl border border-[var(--gold-line)] bg-[var(--gold-dim)] px-4 py-3 text-[11px] font-mono uppercase tracking-[.1em] text-gold transition-colors hover:bg-gold hover:text-bg"
                >
                  {cameraOpen ? 'Kamerayı Kapat' : 'Kamerayı Aç'}
                </button>
              </div>

              {cameraError ? <p className="mt-3 text-[12px] text-[#f1a2a2]">{cameraError}</p> : null}
              {error ? <p className="mt-3 text-[12px] text-[#f1a2a2]">{error}</p> : null}

              {cameraOpen ? (
                <div className="mt-5 overflow-hidden rounded-2xl border border-white/[.08] bg-black/25">
                  <video ref={videoRef} className="aspect-[4/3] w-full object-cover" muted playsInline />
                </div>
              ) : null}
            </Card>

            <Card className="p-5 md:p-6 hover-lift">
              <CardTitle>Barkod Sonucu</CardTitle>
              {!result ? (
                <p className="text-[13px] text-muted">
                  Barkod araması tamamlandığında eşleşen parfüm, aile ve kullanım çerçevesi burada görünür.
                </p>
              ) : result.found ? (
                <div className="anim-up">
                  <p className="text-[2rem] font-semibold leading-[1.05] text-cream">{result.perfume}</p>
                  <p className="mt-2 text-[12px] text-muted">
                    {result.family || 'Aromatik'} · {result.occasion || 'Genel kullanım'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.season.map((season) => (
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
                <p className="text-[13px] text-muted">{result.message || 'Bu barkod katalogda bulunamadı.'}</p>
              )}
            </Card>
          </div>
        </div>
      </ErrorBoundary>
    </AppShell>
  );
}
