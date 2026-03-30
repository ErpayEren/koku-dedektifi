'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { runLayering, readableError } from '@/lib/client/api';
import { getHistory } from '@/lib/client/storage';
import { UI } from '@/lib/strings';
import type { AnalysisResult } from '@/lib/client/types';

const FALLBACK = [
  'Dior Sauvage Eau de Parfum',
  'Chanel No.5 Eau de Parfum',
  'Creed Aventus',
  'Maison Margiela By the Fireplace',
  'Tom Ford Black Orchid',
];

interface PickerProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function Picker({ label, value, options, onChange }: PickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1.5 block text-[11px] text-muted">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl border border-white/[.08] bg-[#15131a] p-3 text-cream outline-none focus:border-[var(--gold-line)]"
      >
        <span className="truncate">{value || 'Sec...'}</span>
        <span className="text-muted">▾</span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-56 overflow-y-auto rounded-xl border border-white/[.08] bg-[#17141d] shadow-[0_18px_36px_rgba(0,0,0,.45)]">
          {options.map((name) => (
            <button
              key={`${label}-${name}`}
              type="button"
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 text-left text-[13px] transition-colors ${
                name === value ? 'bg-[var(--gold-dim)] text-gold' : 'text-cream hover:bg-white/[.04]'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function LayeringPage() {
  const historyRows = useMemo(() => getHistory(), []);
  const nameOptions = useMemo(
    () => Array.from(new Set([...historyRows.map((item) => item.name), ...FALLBACK])),
    [historyRows],
  );

  const [left, setLeft] = useState(nameOptions[0] || '');
  const [right, setRight] = useState(nameOptions[1] || nameOptions[0] || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [compatibility, setCompatibility] = useState(0);
  const [shared, setShared] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const queryLeft = new URLSearchParams(window.location.search).get('left');
    if (queryLeft) setLeft(queryLeft);
  }, []);

  async function run(): Promise<void> {
    if (!left || !right) return;

    if (left === right) {
      setError('Katmanlama icin iki farkli parfum secmelisin.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await runLayering({ left, right });
      setResult(response.result);
      setCompatibility(response.compatibility);
      setShared(response.sharedNotes);
    } catch (errorValue) {
      setError(readableError(errorValue));
      setResult(null);
      setCompatibility(0);
      setShared([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <ErrorBoundary>
        <TopBar title={UI.layeringLab} />
        <div className="px-5 py-8 md:px-12">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[420px_1fr]">
            <Card className="h-fit p-5 md:p-6 hover-lift">
              <CardTitle>{UI.layeringLab}</CardTitle>
              <p className="mb-5 text-[13px] text-muted">
                Dolabindan iki parfum sec. Sistem ortak notalari ve karakter uyumunu hesaplayip tek bir blend
                profili cikarir.
              </p>

              <div className="space-y-4">
                <Picker label={UI.leftScent} value={left} options={nameOptions} onChange={setLeft} />
                <Picker label={UI.rightScent} value={right} options={nameOptions} onChange={setRight} />
              </div>

              <button
                type="button"
                onClick={run}
                disabled={loading || !left || !right}
                className={`mt-5 w-full rounded-xl py-3 text-[11px] font-mono uppercase tracking-[.1em] transition-colors ${
                  loading || !left || !right
                    ? 'border border-white/[.08] bg-white/[.06] text-muted'
                    : 'bg-gold text-bg hover:bg-[#d8b676]'
                }`}
              >
                {loading ? 'Hesaplaniyor...' : UI.analyzeLayering}
              </button>
              {error ? <p className="mt-4 text-[12px] text-[#f1a2a2]">{error}</p> : null}
            </Card>

            <Card className="p-5 md:p-6 hover-lift">
              <CardTitle>Katmanlama Sonucu</CardTitle>
              {!result ? (
                <p className="text-[13px] text-muted">
                  Sol ve sag parfum secip analizi calistirdiginda sonuc burada gorunur.
                </p>
              ) : (
                <div className="anim-up">
                  <p className="font-display text-[2rem] italic leading-[1.05] text-cream">{result.name}</p>
                  <p className="mt-2 text-[12px] text-muted">{result.description}</p>
                  <div className="mt-4 rounded-xl border border-white/[.08] p-3.5">
                    <div className="mb-1.5 flex justify-between text-[11px] text-muted">
                      <span>Uyumluluk</span>
                      <span>{compatibility}/100</span>
                    </div>
                    <div className="h-[6px] overflow-hidden rounded-full bg-white/[.08]">
                      <div
                        className="h-full rounded-full bg-sage transition-all duration-500"
                        style={{ width: `${Math.max(0, Math.min(100, compatibility))}%` }}
                      />
                    </div>
                  </div>
                  {shared.length > 0 ? (
                    <div className="mt-4">
                      <p className="mb-2 text-[11px] text-muted">Ortak notalar</p>
                      <div className="flex flex-wrap gap-2">
                        {shared.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-[var(--gold-line)] px-2 py-1 text-[10px] text-gold"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <Link
                    href={`/?mode=text&q=${encodeURIComponent(result.name)}`}
                    className="mt-4 inline-flex text-[11px] font-mono uppercase tracking-[.08em] text-gold no-underline transition-colors hover:text-cream"
                  >
                    Bu blendi ana analizde ac →
                  </Link>
                </div>
              )}
            </Card>
          </div>
        </div>
      </ErrorBoundary>
    </AppShell>
  );
}
