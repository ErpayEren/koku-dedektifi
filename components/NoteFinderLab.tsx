'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useProGate } from '@/hooks/useProGate';
import { readableError, runFinder } from '@/lib/client/api';
import type { FinderCandidate } from '@/lib/client/types';
import { useToastSync } from '@/lib/client/useToastSync';
import { SkeletonCard } from './ui/SkeletonCard';

function parseCommaList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function NoteFinderLab() {
  const router = useRouter();
  const { requirePro } = useProGate();
  const [includeValue, setIncludeValue] = useState('bergamot, sedir');
  const [excludeValue, setExcludeValue] = useState('');
  const [maxSweetness, setMaxSweetness] = useState(55);
  const [targetSweetness, setTargetSweetness] = useState(35);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<FinderCandidate[]>([]);

  useToastSync({ error });

  async function handleSearch(): Promise<void> {
    if (!requirePro('Nota Avcısı')) return;

    const includeNotes = parseCommaList(includeValue);
    if (includeNotes.length === 0) {
      setError('En az bir dahil nota gir.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const candidates = await runFinder({
        includeNotes,
        excludeNotes: parseCommaList(excludeValue),
        maxSweetness,
        targetSweetness,
        limit: 8,
      });
      setResults(candidates.slice(0, 8));
    } catch (errorValue) {
      setError(readableError(errorValue));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-6 rounded-[28px] border border-white/8 bg-white/[.03] p-5 sm:p-6">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[10px] font-mono uppercase tracking-[.14em] text-muted">Dahil notalar</p>
            <input
              value={includeValue}
              onChange={(event) => setIncludeValue(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-sm text-cream outline-none transition-colors focus:border-[var(--gold-line)]"
              placeholder="bergamot, sedir, iris"
            />
          </div>
          <div>
            <p className="mb-2 text-[10px] font-mono uppercase tracking-[.14em] text-muted">Hariç notalar</p>
            <input
              value={excludeValue}
              onChange={(event) => setExcludeValue(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-sm text-cream outline-none transition-colors focus:border-[var(--gold-line)]"
              placeholder="vanilya, paçuli"
            />
          </div>
          <RangeRow label="Maks. tatlılık" value={maxSweetness} onChange={setMaxSweetness} />
          <RangeRow label="Hedef tatlılık" value={targetSweetness} onChange={setTargetSweetness} />
          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={loading}
            className={`w-full rounded-xl py-3 text-[11px] font-mono uppercase tracking-[.1em] transition-colors ${
              loading ? 'border border-white/[.08] bg-white/[.06] text-muted' : 'bg-gold text-bg hover:bg-[#d8b676]'
            }`}
          >
            {loading ? 'Öneriler hazırlanıyor...' : '8 parfüm önerisi üret'}
          </button>
        </div>

        <div className="rounded-[24px] border border-white/8 bg-black/10 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[.14em] text-gold/80">Öneri havuzu</p>
              <h2 className="mt-2 text-[1.25rem] font-semibold text-cream">Nota Avcısı Sonuçları</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[.12em] text-gold">
              {results.length} sonuç
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <SkeletonCard lines={4} className="h-full" />
              <SkeletonCard lines={4} className="h-full" />
              <SkeletonCard lines={4} className="h-full" />
              <SkeletonCard lines={4} className="h-full" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted">
              Dahil ve hariç notaları girip aramayı başlattığında öneriler burada görünür.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {results.map((candidate) => (
                <button
                  key={`${candidate.name}-${candidate.score}`}
                  type="button"
                  onClick={() => router.push(`/?mode=text&q=${encodeURIComponent(candidate.name)}`)}
                  className="rounded-[22px] border border-white/8 bg-white/[.03] p-4 text-left transition-all hover:border-[var(--gold-line)] hover:bg-white/[.05]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[1.15rem] font-semibold leading-tight text-cream">{candidate.name}</p>
                      {candidate.brand ? <p className="mt-1 text-[12px] text-muted">{candidate.brand}</p> : null}
                    </div>
                    <span className="rounded-full border border-sage/25 bg-sage/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[.1em] text-sage">
                      %{candidate.score}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[.1em] text-gold">
                      {candidate.family}
                    </span>
                    {candidate.occasion ? (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-muted">
                        {candidate.occasion}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-[12px] leading-relaxed text-cream/78">
                    {candidate.reason || 'Bu profil, seçtiğin notalarla savunulabilir bir uyum gösteriyor.'}
                  </p>

                  {candidate.includeMatches?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {candidate.includeMatches.slice(0, 3).map((match) => (
                        <span
                          key={`${candidate.name}-${match}`}
                          className="rounded-full border border-sage/25 bg-sage/10 px-2.5 py-1 text-[10px] text-sage"
                        >
                          {match}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <span className="mt-4 inline-flex text-[11px] font-mono uppercase tracking-[.08em] text-gold">
                    Ana sayfada analiz et →
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 text-right">
            <Link href="/paketler" className="text-[11px] font-mono uppercase tracking-[.08em] text-gold transition-colors hover:text-cream">
              Pro ayrıntılarını gör
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function RangeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-mono uppercase tracking-[.14em] text-muted">{label}</p>
        <span className="text-[11px] text-cream">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[#d4b16b]"
      />
    </div>
  );
}
