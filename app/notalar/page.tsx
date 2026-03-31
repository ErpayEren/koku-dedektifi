'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { runFinder, readableError } from '@/lib/client/api';
import type { FinderCandidate } from '@/lib/client/types';
import { UI } from '@/lib/strings';

function parseNotes(input: string): string[] {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function scoreTone(score: number): string {
  if (score >= 80) return 'Çok Uyumlu';
  if (score >= 65) return 'Güçlü Aday';
  if (score >= 50) return 'Dengeli Aday';
  return 'Zayıf Eşleşme';
}

export default function NotalarPage() {
  const [includeRaw, setIncludeRaw] = useState('bergamot, lavanta');
  const [excludeRaw, setExcludeRaw] = useState('');
  const [maxSweetness, setMaxSweetness] = useState(60);
  const [targetSweetness, setTargetSweetness] = useState(45);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<FinderCandidate[]>([]);

  const includeCount = useMemo(() => parseNotes(includeRaw).length, [includeRaw]);

  async function onSearch(): Promise<void> {
    setError('');
    setLoading(true);
    try {
      const candidates = await runFinder({
        includeNotes: parseNotes(includeRaw),
        excludeNotes: parseNotes(excludeRaw),
        maxSweetness,
        targetSweetness,
        limit: 12,
      });
      setRows(candidates);
    } catch (err) {
      setError(readableError(err));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <TopBar title={UI.noteFinder} />
      <div className="px-5 md:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
          <Card className="p-5 md:p-6 h-fit hover-lift">
            <CardTitle>{UI.noteFinder}</CardTitle>
            <label className="text-[11px] text-muted block mb-1.5">{UI.includeNotes}</label>
            <textarea
              value={includeRaw}
              onChange={(event) => setIncludeRaw(event.target.value)}
              className="w-full min-h-[92px] rounded-xl border border-white/[.08] bg-transparent p-3.5 text-[14px] text-cream outline-none focus:border-[var(--gold-line)] resize-none"
              placeholder="bergamot, lavanta, vetiver"
            />

            <label className="text-[11px] text-muted block mb-1.5 mt-4">{UI.excludeNotes}</label>
            <input
              value={excludeRaw}
              onChange={(event) => setExcludeRaw(event.target.value)}
              className="w-full rounded-xl border border-white/[.08] bg-transparent p-3.5 text-[14px] text-cream outline-none focus:border-[var(--gold-line)]"
              placeholder="aşırı tatlı, pudralı"
            />

            <div className="mt-5">
              <div className="flex justify-between text-[11px] text-muted mb-1">
                <span>{UI.maxSweetness}</span>
                <span>{maxSweetness}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={maxSweetness}
                onChange={(e) => setMaxSweetness(Number(e.target.value))}
                className="w-full accent-[#d8b06d]"
              />
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-muted mb-1">
                <span>{UI.targetSweetness}</span>
                <span>{targetSweetness}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={targetSweetness}
                onChange={(e) => setTargetSweetness(Number(e.target.value))}
                className="w-full accent-[#7EB8A4]"
              />
            </div>

            <button
              type="button"
              onClick={onSearch}
              disabled={loading || includeCount === 0}
              className={`mt-5 w-full rounded-xl py-3 text-[11px] font-mono uppercase tracking-[.1em] transition-colors
              ${
                loading || includeCount === 0
                  ? 'bg-white/[.06] text-muted border border-white/[.08]'
                  : 'bg-gold text-bg hover:bg-[#d9b778]'
              }`}
            >
              {loading ? 'Aranıyor…' : UI.getResults}
            </button>

            {error ? <p className="mt-4 text-[12px] text-[#f1a2a2]">{error}</p> : null}
          </Card>

          <Card className="p-5 md:p-6 hover-lift">
            <CardTitle>Sonuçlar</CardTitle>
            {rows.length === 0 ? (
              <p className="text-[13px] text-muted">
                {loading ? 'Koku adayları hesaplanıyor…' : 'Notaları girip aramayı çalıştırdığında aday parfümler burada sıralanır.'}
              </p>
            ) : (
              <div className="space-y-3">
                {rows.map((item) => (
                  <div key={item.name} className="rounded-xl border border-white/[.08] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[18px] font-semibold leading-[1.08] text-cream">{item.name}</p>
                      <span className="text-[11px] px-2.5 py-1 rounded-full border border-sage/40 text-sage">
                        {item.score}/100
                      </span>
                    </div>
                    <p className="text-[12px] text-muted mt-1">
                      {item.family} • tatlılık {item.sweetness} • {scoreTone(item.score)}
                    </p>
                    <div className="h-[5px] rounded-full bg-white/[.08] mt-3 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#6fb3a0] to-[#d8b06d] transition-all duration-500"
                        style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {item.includeMatches.map((tag) => (
                        <span key={`${item.name}-${tag}`} className="text-[10px] px-2 py-1 rounded-full border border-white/[.08] text-muted">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <Link
                      href={`/?mode=text&q=${encodeURIComponent(item.name)}`}
                      className="inline-flex mt-3 text-[11px] font-mono uppercase tracking-[.08em] text-gold hover:text-cream transition-colors no-underline"
                    >
                      Bu adayı analiz et →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
