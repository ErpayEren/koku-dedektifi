'use client';

import { useEffect, useMemo, useState } from 'react';
import { Archive, BarChart3, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { EmptyState } from '@/components/ui/EmptyState';
import { clearFeed, getFeed, pushFeed } from '@/lib/client/storage';
import { UI } from '@/lib/strings';

type VoteType = 'strong' | 'balanced' | 'light';

const VOTE_STORAGE_KEY = 'kd:community:vote:v1';

function toVoteLabel(type: VoteType): string {
  if (type === 'strong') return 'Güçlü + Yayılımlı';
  if (type === 'balanced') return 'Dengeli';
  return 'Hafif';
}

export default function AkisPage() {
  const [feed, setFeed] = useState(() => getFeed());
  const [selectedVote, setSelectedVote] = useState<VoteType | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(VOTE_STORAGE_KEY);
    if (saved === 'strong' || saved === 'balanced' || saved === 'light') {
      setSelectedVote(saved);
    }
  }, []);

  const voteCount = useMemo(() => feed.filter((item) => item.event === 'vote').length, [feed]);

  function handleVote(type: VoteType): void {
    if (selectedVote) return;

    pushFeed({
      event: 'vote',
      detail: `Topluluk oyu: ${toVoteLabel(type)}`,
      perfume: 'Genel profil',
    });

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VOTE_STORAGE_KEY, type);
    }

    setSelectedVote(type);
    setFeed(getFeed());
  }

  return (
    <AppShell>
      <TopBar title={UI.feed} />

      <div className="px-5 py-8 md:px-12">
        <Card className="mb-5 p-5 md:p-6 hover-lift">
          <CardTitle>{UI.communityPulse}</CardTitle>
          <p className="mb-3 text-[13px] text-muted">
            Topluluk sinyalini tek oyla güncelleyebilirsin. Aynı cihazda bir kez oy kullanılabilir.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {(['strong', 'balanced', 'light'] as VoteType[]).map((type) => {
              const active = selectedVote === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleVote(type)}
                  disabled={Boolean(selectedVote)}
                  className={`min-w-[80px] flex-1 rounded-full border py-2.5 text-center text-xs font-semibold tracking-wide transition-all duration-200 ${
                    active
                      ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                      : 'border-white/15 bg-white/5 text-white/60 active:bg-white/10'
                  } ${selectedVote && !active ? 'cursor-not-allowed opacity-55' : ''}`}
                >
                  {toVoteLabel(type)}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-[11px] text-muted">
            Toplam oy: {voteCount}
            {selectedVote ? ` • Senin oyun: ${toVoteLabel(selectedVote)}` : ''}
          </p>
        </Card>

        {feed.length === 0 ? (
          <Card className="p-4">
            <EmptyState title={UI.emptyCommunity} subtitle={UI.emptyCommunitySub} />
          </Card>
        ) : (
          <Card className="p-5 md:p-6 hover-lift">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-px w-5 bg-amber-500/60" />
                <span className="text-[11px] font-medium tracking-[0.2em] text-amber-500/80">SON ETKİNLİKLER</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearFeed();
                  if (typeof window !== 'undefined') {
                    window.localStorage.removeItem(VOTE_STORAGE_KEY);
                  }
                  setSelectedVote(null);
                  setFeed([]);
                }}
                className="px-2 py-1 text-xs text-white/30 transition-colors hover:text-white/60"
              >
                Temizle
              </button>
            </div>

            <div className="space-y-3">
              {feed.map((item) => (
                <div
                  key={item.id}
                  className="mb-2 flex items-start gap-3 rounded-xl border border-white/8 bg-white/3 p-4"
                >
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

  return <Archive className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.8} />;
}
