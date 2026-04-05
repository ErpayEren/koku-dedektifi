'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Sparkles, TrendingUp } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { clearFeed, getFeed } from '@/lib/client/storage';
import { useToastSync } from '@/lib/client/useToastSync';

interface TrendItem {
  name: string;
  count: number;
  family?: string;
}

interface PollTotal {
  perfumeName: string;
  votes: number;
}

interface CommunityHubResponse {
  weekKey: string;
  trends: TrendItem[];
  poll: {
    options: string[];
    totals: PollTotal[];
    userVote: string | null;
    source?: string;
  };
}

export default function AkisPage() {
  const [feed, setFeed] = useState(() => getFeed());
  const [hub, setHub] = useState<CommunityHubResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingVote, setLoadingVote] = useState(false);

  useToastSync({ error });

  useEffect(() => {
    void loadHub();
  }, []);

  const totalVotes = useMemo(
    () => (hub?.poll.totals || []).reduce((sum, item) => sum + item.votes, 0),
    [hub],
  );

  async function loadHub(): Promise<void> {
    setLoading(true);
    try {
      const response = await fetch('/api/community-hub', { credentials: 'include' });
      if (!response.ok) {
        setError('Topluluk verisi şu an yüklenemedi.');
        return;
      }
      const payload = (await response.json()) as CommunityHubResponse;
      setHub(payload);
      setError('');
    } catch {
      setHub(null);
      setError('Topluluk verisi şu an yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVote(perfumeName: string): Promise<void> {
    if (hub?.poll.userVote || loadingVote) return;
    setLoadingVote(true);
    try {
      const response = await fetch('/api/community-hub', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfumeName }),
      });
      if (!response.ok) {
        setError('Oy kaydedilirken bir sorun oluştu.');
        return;
      }
      const payload = (await response.json()) as CommunityHubResponse;
      setHub(payload);
      setError('');
    } finally {
      setLoadingVote(false);
    }
  }

  return (
    <AppShell>
      <TopBar title="Koku Akışı" />

      <div className="px-5 py-8 md:px-12">
        {loading ? (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_.9fr]">
            <SkeletonCard lines={5} />
            <SkeletonCard lines={5} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_.9fr]">
            <Card className="p-5 md:p-6 hover-lift">
              <CardTitle>Günün trendi</CardTitle>
              {hub?.trends?.length ? (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {hub.trends.map((trend, index) => (
                    <div key={trend.name} className="rounded-[22px] border border-white/8 bg-white/[.03] p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/15 text-amber-400">
                          <TrendingUp className="h-4 w-4" strokeWidth={1.8} />
                        </span>
                        <span className="text-[11px] font-mono uppercase tracking-[.12em] text-gold">#{index + 1}</span>
                      </div>
                      <p className="text-[1.1rem] font-semibold leading-tight text-cream">{trend.name}</p>
                      <p className="mt-2 text-[12px] text-muted">
                        {trend.family || 'Profil'} · {trend.count} analiz
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted">Bugünün trend verisi henüz birikmedi.</p>
              )}
            </Card>

            <Card className="p-5 md:p-6 hover-lift">
              <CardTitle>Bu hafta hangi koku öne çıktı?</CardTitle>
              <p className="mt-2 text-[13px] text-muted">Aynı kullanıcı her hafta bir kez oy kullanabilir.</p>

              <div className="mt-4 flex flex-col gap-3">
                {(hub?.poll.options || []).map((option) => {
                  const active = hub?.poll.userVote === option;
                  const voteCount = hub?.poll.totals.find((item) => item.perfumeName === option)?.votes || 0;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => void handleVote(option)}
                      disabled={Boolean(hub?.poll.userVote) || loadingVote}
                      className={`rounded-xl border px-4 py-3 text-left transition-all ${
                        active
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                          : 'border-white/8 bg-white/[.03] text-cream hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span>{option}</span>
                        <span className="text-[11px] text-muted">{voteCount} oy</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-[11px] text-muted">
                Toplam oy: {totalVotes}
                {hub?.poll.source ? ` · Kaynak: ${hub.poll.source}` : ''}
              </p>
              {error ? <p className="mt-2 text-[12px] text-[#f1a2a2]">{error}</p> : null}
            </Card>
          </div>
        )}

        {feed.length === 0 ? (
          <Card className="mt-5 p-4">
            <EmptyState
              title="Henüz topluluk sinyali yok"
              subtitle="Analizler geldikçe günün trendleri ve topluluk hareketi burada görünür olacak."
              action={
                <Link
                  href="/"
                  className="inline-flex items-center rounded-md border border-[var(--gold-line)] bg-[var(--gold-dim)] px-5 py-3 text-[11px] font-mono uppercase tracking-[.08em] text-gold no-underline transition-colors hover:bg-gold/15"
                >
                  Analiz Et →
                </Link>
              }
            />
          </Card>
        ) : (
          <Card className="mt-5 p-5 md:p-6 hover-lift">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-px w-5 bg-amber-500/60" />
                <span className="text-[11px] font-medium tracking-[0.2em] text-amber-500/80">SON ETKİNLİKLER</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearFeed();
                  setFeed([]);
                }}
                className="px-2 py-1 text-xs text-white/30 transition-colors hover:text-white/60"
              >
                Temizle
              </button>
            </div>

            <div className="space-y-3">
              {feed.map((item) => (
                <div key={item.id} className="mb-2 flex items-start gap-3 rounded-xl border border-white/8 bg-white/3 p-4">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/15">
                    <ActivityIcon event={item.event} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white/90">{item.detail}</p>
                    <p className="mt-0.5 text-[11px] text-white/35">
                      {item.perfume || 'Genel profil'} · {new Date(item.ts).toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function ActivityIcon({ event }: { event: string }) {
  if (event === 'vote') {
    return <BarChart3 className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.8} />;
  }

  if (event === 'analysis') {
    return <Sparkles className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.8} />;
  }

  return <TrendingUp className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.8} />;
}
