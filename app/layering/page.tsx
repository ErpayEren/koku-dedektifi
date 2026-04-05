'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { useProGate } from '@/hooks/useProGate';
import { readableError, runLayering } from '@/lib/client/api';
import { syncWardrobeFromRemote } from '@/lib/client/wardrobe';
import type { AnalysisResult, WardrobeItem } from '@/lib/client/types';

const FALLBACK = [
  'Dior Sauvage Eau de Parfum',
  'Chanel No.5 Eau de Parfum',
  'Creed Aventus',
  'Maison Margiela By the Fireplace',
  'Tom Ford Black Orchid',
];

export default function LayeringPage() {
  const { requirePro } = useProGate();
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [manualLeft, setManualLeft] = useState('');
  const [manualRight, setManualRight] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [compatibility, setCompatibility] = useState(0);
  const [shared, setShared] = useState<string[]>([]);

  useEffect(() => {
    void (async () => {
      const rows = await syncWardrobeFromRemote();
      setWardrobe(rows);
      if (rows[0]) setLeft(rows[0].name);
      if (rows[1]) setRight(rows[1].name);
    })();
  }, []);

  const nameOptions = useMemo(
    () => Array.from(new Set([...wardrobe.map((item) => item.name), ...FALLBACK])),
    [wardrobe],
  );
  const useManualMode = wardrobe.length === 0;

  async function run(): Promise<void> {
    if (!requirePro('Katmanlama Lab')) return;
    const leftValue = (useManualMode ? manualLeft : left).trim();
    const rightValue = (useManualMode ? manualRight : right).trim();

    if (!leftValue || !rightValue) {
      setError('İki parfüm de gerekli.');
      return;
    }

    if (leftValue === rightValue) {
      setError('Katmanlama için iki farklı parfüm seçmelisin.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await runLayering({ left: leftValue, right: rightValue });
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
        <TopBar title="Katmanlama Lab" />
        <div className="px-5 py-8 md:px-12">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[420px_1fr]">
            <Card className="h-fit p-5 md:p-6 hover-lift">
              <CardTitle>Katmanlama Lab</CardTitle>
              <p className="mb-5 text-[13px] text-muted">
                Dolabından iki parfüm seç. Sistem ortak notaları ve karakter uyumunu hesaplayıp tek bir blend profili çıkarır.
              </p>

              {useManualMode ? (
                <div className="space-y-4">
                  <InputField label="Sol parfüm" value={manualLeft} onChange={setManualLeft} />
                  <InputField label="Sağ parfüm" value={manualRight} onChange={setManualRight} />
                </div>
              ) : (
                <div className="space-y-4">
                  <SelectField label="Sol parfüm" value={left} onChange={setLeft} options={nameOptions} />
                  <SelectField label="Sağ parfüm" value={right} onChange={setRight} options={nameOptions} />
                </div>
              )}

              <button
                type="button"
                onClick={() => void run()}
                disabled={loading}
                className={`mt-5 w-full rounded-xl py-3 text-[11px] font-mono uppercase tracking-[.1em] transition-colors ${
                  loading ? 'border border-white/[.08] bg-white/[.06] text-muted' : 'bg-gold text-bg hover:bg-[#d8b676]'
                }`}
              >
                {loading ? 'Blend hazırlanıyor...' : 'Katmanlamayı analiz et'}
              </button>
              {error ? <p className="mt-4 text-[12px] text-[#f1a2a2]">{error}</p> : null}
            </Card>

            <Card className="p-5 md:p-6 hover-lift">
              <CardTitle>Katmanlama Sonucu</CardTitle>
              {!result ? (
                <p className="text-[13px] text-muted">
                  Sol ve sağ parfümü seçip analizi çalıştırdığında sonuç burada görünür.
                </p>
              ) : (
                <div>
                  <p className="text-[2rem] font-semibold leading-[1.05] text-cream">{result.name}</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-cream/82">{result.moodProfile || result.description}</p>

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
                          <span key={tag} className="rounded-full border border-sage/30 bg-sage/10 px-2.5 py-1 text-[10px] text-sage">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <InfoBox label="Karakter Tanımı" value={result.expertComment || result.description} />
                    <InfoBox
                      label="Sürüş Talimatı"
                      value={
                        result.applicationTip ||
                        result.layeringTip ||
                        'Önce daha hafif kokuyu, ardından daha koyu izi taşıyan katmanı uygula.'
                      }
                    />
                  </div>

                  <Link
                    href={`/?mode=text&q=${encodeURIComponent(result.name)}`}
                    className="mt-4 inline-flex text-[11px] font-mono uppercase tracking-[.08em] text-gold no-underline transition-colors hover:text-cream"
                  >
                    Bu blendi ana analizde aç →
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

function InputField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] text-muted">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/[.08] bg-transparent p-3.5 text-[14px] text-cream outline-none focus:border-[var(--gold-line)]"
        placeholder="Parfüm adı"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] text-muted">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/[.08] bg-[#15131a] p-3 text-cream outline-none focus:border-[var(--gold-line)]"
      >
        {options.map((name) => (
          <option key={`${label}-${name}`} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/[.06] bg-white/[.02] px-4 py-4">
      <p className="text-[10px] font-mono uppercase tracking-[.14em] text-gold">{label}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-cream/84">{value}</p>
    </div>
  );
}
