'use client';

import { useEffect, useMemo, useState } from 'react';
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

  const voteCount = useMemo(() => {
    return feed.filter((item) => item.event === 'vote').length;
  }, [feed]);

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
      <div className="px-5 md:px-12 py-8">
        <Card className="p-5 md:p-6 mb-5 hover-lift">
          <CardTitle>{UI.communityPulse}</CardTitle>
          <p className="text-[13px] text-muted mb-3">
            Topluluk sinyalini tek oyla güncelleyebilirsin. Aynı cihazda bir kez oy kullanılabilir.
          </p>

          <div className="flex flex-wrap gap-2">
            {(['strong', 'balanced', 'light'] as VoteType[]).map((type) => {
              const active = selectedVote === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleVote(type)}
                  disabled={Boolean(selectedVote)}
                  className={`px-3 py-2 text-[11px] rounded-lg border transition-colors
                    ${
                      active
                        ? 'border-[var(--gold-line)] text-gold bg-[var(--gold-dim)]'
                        : 'border-white/[.08] text-cream hover:border-[var(--gold-line)]'
                    }
                    ${selectedVote && !active ? 'opacity-55 cursor-not-allowed' : ''}`}
                >
                  {toVoteLabel(type)}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-muted mt-3">
            Toplam oy: {voteCount}
            {selectedVote ? ` • Senin oyun: ${toVoteLabel(selectedVote)}` : ''}
          </p>
        </Card>

        {feed.length === 0 ? (
          <Card className="p-4">
            <EmptyState title={UI.emptyCommunity} body={UI.emptyCommunitySub} />
          </Card>
        ) : (
          <Card className="p-5 md:p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Son Etkinlikler</CardTitle>
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
                className="text-[11px] text-muted hover:text-cream transition-colors"
              >
                Temizle
              </button>
            </div>
            <div className="space-y-3">
              {feed.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/[.08] p-3.5">
                  <p className="text-[13px] text-cream">{item.detail}</p>
                  <p className="text-[11px] text-muted mt-1">
                    {item.perfume || '—'} • {new Date(item.ts).toLocaleString('tr-TR')}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

