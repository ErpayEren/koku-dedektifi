'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { runLayering, readableError } from '@/lib/client/api';
import { getHistory } from '@/lib/client/storage';
import { UI } from '@/lib/strings';
import type { AnalysisResult } from '@/lib/client/types';

const FALLBACK = [
  'Dior Sauvage Eau de Parfum',
  'Chanel N°5 Eau de Parfum',
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
      <label className="block text-[11px] text-muted mb-1.5">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full rounded-xl border border-white/[.08] bg-[#15131a] p-3 text-cream outline-none
                   focus:border-[var(--gold-line)] flex items-center justify-between"
      >
        <span className="truncate">{value || 'Seç...'}</span>
        <span className="text-muted">▾</span>
      </button>

      {open ? (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-30 rounded-xl border border-white/[.08] bg-[#17141d] shadow-[0_18px_36px_rgba(0,0,0,.45)] max-h-56 overflow-y-auto">
          {options.map((name) => (
            <button
              key={`${label}-${name}`}
              type="button"
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2.5 text-[13px] transition-colors
                ${name === value ? 'text-gold bg-[var(--gold-dim)]' : 'text-cream hover:bg-white/[.04]'}`}
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
      setError('Katmanlama için iki farklı parfüm seçmelisin.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await runLayering({ left, right });
      setResult(response.result);
      setCompatibility(response.compatibility);
      setShared(response.sharedNotes);
    } catch (err) {
      setError(readableError(err));
      setResult(null);
      setCompatibility(0);
      setShared([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <TopBar title={UI.layeringLab} />
      <div className="px-5 md:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-5">
          <Card className="p-5 md:p-6 h-fit hover-lift">
            <CardTitle>{UI.layeringLab}</CardTitle>
            <p className="text-[13px] text-muted mb-5">
              Dolabından iki parfüm seç. Sistem ortak notaları ve karakter uyumunu hesaplayıp tek bir blend profili çıkarır.
            </p>

            <div className="space-y-4">
              <Picker label={UI.leftScent} value={left} options={nameOptions} onChange={setLeft} />
              <Picker label={UI.rightScent} value={right} options={nameOptions} onChange={setRight} />
            </div>

            <button
              type="button"
              onClick={run}
              disabled={loading || !left || !right}
              className={`mt-5 w-full rounded-xl py-3 text-[11px] font-mono uppercase tracking-[.1em] transition-colors
                ${
                  loading || !left || !right
                    ? 'bg-white/[.06] text-muted border border-white/[.08]'
                    : 'bg-gold text-bg hover:bg-[#d8b676]'
                }`}
            >
              {loading ? 'Hesaplanıyor…' : UI.analyzeLayering}
            </button>
            {error ? <p className="mt-4 text-[12px] text-[#f1a2a2]">{error}</p> : null}
          </Card>

          <Card className="p-5 md:p-6 hover-lift">
            <CardTitle>Katmanlama Sonucu</CardTitle>
            {!result ? (
              <p className="text-[13px] text-muted">Sol ve sağ parfüm seçip analizi çalıştırdığında sonuç burada görünür.</p>
            ) : (
              <div className="anim-up">
                <p className="font-display italic text-[2rem] text-cream leading-[1.05]">{result.name}</p>
                <p className="text-[12px] text-muted mt-2">{result.description}</p>
                <div className="mt-4 rounded-xl border border-white/[.08] p-3.5">
                  <div className="flex justify-between text-[11px] text-muted mb-1.5">
                    <span>Uyumluluk</span>
                    <span>{compatibility}/100</span>
                  </div>
                  <div className="h-[6px] bg-white/[.08] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sage rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(0, Math.min(100, compatibility))}%` }}
                    />
                  </div>
                </div>
                {shared.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-[11px] text-muted mb-2">Ortak notalar</p>
                    <div className="flex flex-wrap gap-2">
                      {shared.map((tag) => (
                        <span key={tag} className="text-[10px] px-2 py-1 rounded-full border border-[var(--gold-line)] text-gold">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                <Link
                  href={`/?mode=text&q=${encodeURIComponent(result.name)}`}
                  className="inline-flex mt-4 text-[11px] font-mono uppercase tracking-[.08em] text-gold hover:text-cream transition-colors no-underline"
                >
                  Bu blendi ana analizde aç →
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
