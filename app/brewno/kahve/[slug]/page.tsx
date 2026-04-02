'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BrewScoreRing } from '@/components/brewno/BrewScoreRing';
import { TasteRadar } from '@/components/brewno/TasteRadar';
import { FlavorNoteTag } from '@/components/brewno/FlavorNoteTag';
import { RatingModal } from '@/components/brewno/RatingModal';
import { CoffeeCard } from '@/components/brewno/CoffeeCard';
import type { Coffee, CoffeeRating } from '@/lib/brewno';
import { ROAST_LABELS, PROCESS_LABELS, formatAltitude, processEmoji, roastLevelEmoji } from '@/lib/brewno';

interface CoffeeDetailData {
  coffee: Coffee;
  ratings: Array<CoffeeRating & { brewno_profiles?: { username: string | null; display_name: string | null; avatar_url: string | null } }>;
}

function AttributeBar({ label, value, color }: { label: string; value: number | null; color: string }) {
  if (value == null) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/50">{label}</span>
        <span className="text-xs font-medium" style={{ color }}>{value}/10</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${(value / 10) * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function CoffeeDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [data, setData] = useState<CoffeeDetailData | null>(null);
  const [similar, setSimilar] = useState<Coffee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'brew'>('overview');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/brewno/coffees/${slug}`);
      if (!res.ok) return;
      const json = await res.json();
      setData(json);

      // Fetch similar via collaborative filtering
      if (json.coffee?.id) {
        const simRes = await fetch('/api/brewno/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coffee_id: json.coffee.id }),
        });
        if (simRes.ok) {
          const simData = await simRes.json();
          setSimilar(simData.similar ?? []);
        }
      }
    } catch (err) {
      console.error('[Brewno] coffee detail error:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500/20 border-t-amber-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg text-white/60">Coffee not found</p>
        <Link href="/brewno" className="text-sm text-amber-400 hover:underline">← Back to Brewno</Link>
      </div>
    );
  }

  const { coffee, ratings } = data;

  return (
    <>
      <div className="min-h-screen">
        {/* Hero */}
        <div className="relative h-[300px] overflow-hidden md:h-[380px]">
          {coffee.cover_image_url ? (
            <img
              src={coffee.cover_image_url}
              alt={coffee.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-white/[0.02] text-8xl opacity-20">☕</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#09080a] via-[#09080a]/60 to-transparent" />

          {/* Back button */}
          <Link
            href="/brewno"
            className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-sm text-white/70 backdrop-blur-sm hover:text-white transition-colors md:left-8 md:top-8"
          >
            ← Back
          </Link>
        </div>

        {/* Content */}
        <div className="px-4 pb-16 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="-mt-20 relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[12px] uppercase tracking-[0.2em] text-amber-400/80">
                {coffee.roaster}
              </p>
              <h1 className="mt-1 font-display text-3xl font-medium text-cream md:text-4xl">
                {coffee.name}
              </h1>
              <p className="mt-1 text-white/50">
                {[coffee.origin_region, coffee.origin_country].filter(Boolean).join(' · ')}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <BrewScoreRing score={coffee.brew_score} size={72} showLabel />
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-bold text-cream">
                    {coffee.community_rating_avg?.toFixed(1) ?? '—'}
                  </span>
                  <span className="text-amber-400 text-lg">★</span>
                </div>
                <p className="text-xs text-white/40">{coffee.community_rating_count ?? 0} ratings</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRatingModal(true)}
                className="rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 px-5 py-3 text-sm font-bold text-black shadow-[0_4px_20px_rgba(217,119,6,0.3)] transition-all hover:shadow-[0_4px_24px_rgba(245,158,11,0.4)] active:scale-95"
              >
                Rate Coffee
              </button>
            </div>
          </div>

          {/* Attributes strip */}
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-white/70">
              <span>{roastLevelEmoji(coffee.roast_level)}</span>
              {coffee.roast_level ? (ROAST_LABELS[coffee.roast_level] ?? coffee.roast_level) : '—'}
            </span>
            {coffee.process && (
              <span className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-white/70">
                <span>{processEmoji(coffee.process)}</span>
                {PROCESS_LABELS[coffee.process] ?? coffee.process}
              </span>
            )}
            {coffee.altitude_m && (
              <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-white/70">
                ⛰ {formatAltitude(coffee.altitude_m)}
              </span>
            )}
            {coffee.variety.length > 0 && (
              <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-white/70">
                🌱 {coffee.variety.join(', ')}
              </span>
            )}
            {coffee.certifications.map((cert) => (
              <span key={cert} className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm capitalize text-emerald-400">
                {cert}
              </span>
            ))}
          </div>

          {/* Flavor notes */}
          {coffee.flavor_notes.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {coffee.flavor_notes.map((note) => (
                <FlavorNoteTag key={note} note={note} size="lg" />
              ))}
            </div>
          )}

          {/* Tab navigation */}
          <div className="mt-8 flex gap-1 border-b border-white/[0.06]">
            {(['overview', 'reviews', 'brew'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium capitalize transition-all ${
                  activeTab === tab
                    ? 'border-b-2 border-amber-400 text-amber-400'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {tab === 'brew' ? 'Brew Tips' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'reviews' && ` (${ratings.length})`}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="mt-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Left: description + attributes */}
                <div className="space-y-6">
                  {coffee.description && (
                    <div>
                      <h3 className="mb-2 text-sm font-medium uppercase tracking-[0.12em] text-white/30">About</h3>
                      <p className="text-sm leading-relaxed text-white/70">{coffee.description}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="mb-4 text-sm font-medium uppercase tracking-[0.12em] text-white/30">
                      Taste Profile
                    </h3>
                    <div className="space-y-3">
                      <AttributeBar label="Aroma"      value={coffee.aroma_score}     color="#f59e0b" />
                      <AttributeBar label="Acidity"    value={coffee.acidity_score}   color="#7eb8a4" />
                      <AttributeBar label="Sweetness"  value={coffee.sweetness_score} color="#c9a96e" />
                      <AttributeBar label="Body"       value={coffee.body_score}      color="#a78bfa" />
                      <AttributeBar label="Bitterness" value={coffee.bitterness_score} color="#e05252" />
                    </div>
                  </div>

                  {/* Price */}
                  {coffee.price_per_100g && (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <p className="text-xs text-white/40 uppercase tracking-[0.12em]">Price</p>
                      <p className="mt-1 text-xl font-bold text-cream">
                        ${coffee.price_per_100g.toFixed(2)}
                        <span className="ml-1 text-sm font-normal text-white/40">per 100g</span>
                      </p>
                      {coffee.bag_sizes.length > 0 && (
                        <div className="mt-2 flex gap-2">
                          {coffee.bag_sizes.map((size) => (
                            <span key={size} className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-xs text-white/50">
                              {size}g
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: radar */}
                <div className="flex flex-col items-center justify-start">
                  <h3 className="mb-4 text-sm font-medium uppercase tracking-[0.12em] text-white/30">
                    Sensory Map
                  </h3>
                  <TasteRadar
                    acidity={coffee.acidity_score}
                    sweetness={coffee.sweetness_score}
                    body={coffee.body_score}
                    bitterness={coffee.bitterness_score}
                    aroma={coffee.aroma_score}
                    size={260}
                  />
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {ratings.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-4xl mb-3">☕</p>
                    <p className="text-white/50">No reviews yet. Be the first to rate this coffee.</p>
                    <button
                      type="button"
                      onClick={() => setShowRatingModal(true)}
                      className="mt-4 rounded-xl bg-amber-500/20 px-4 py-2 text-sm text-amber-400 hover:bg-amber-500/30 transition-colors"
                    >
                      Add Your Rating
                    </button>
                  </div>
                ) : (
                  ratings.map((rating) => {
                    const profile = rating.brewno_profiles;
                    return (
                      <div key={rating.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-sm">
                              {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                              ) : '👤'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-cream/80">
                                {profile?.display_name ?? profile?.username ?? 'Anonymous'}
                              </p>
                              {rating.brew_method && (
                                <p className="text-xs text-white/40 capitalize">{rating.brew_method.replace('-', ' ')}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-amber-400 text-sm">{'★'.repeat(Math.round(rating.overall_score))}</span>
                            <span className="text-sm font-bold text-amber-400">{rating.overall_score.toFixed(1)}</span>
                          </div>
                        </div>
                        {rating.review_text && (
                          <p className="mt-3 text-sm leading-relaxed text-white/60">{rating.review_text}</p>
                        )}
                        {rating.liked_notes.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {rating.liked_notes.map((note) => (
                              <FlavorNoteTag key={note} note={note} size="sm" />
                            ))}
                          </div>
                        )}
                        <p className="mt-2 text-xs text-white/30">
                          {new Date(rating.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'brew' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
                  <h3 className="mb-1 font-medium text-cream">Brewing Recommendations</h3>
                  <p className="mb-5 text-sm text-white/50">
                    Optimal brewing parameters for {coffee.name}
                  </p>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {coffee.roast_level && (
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-white/30">Roast Level</p>
                        <p className="mt-1 text-sm font-medium text-cream/80 capitalize">
                          {roastLevelEmoji(coffee.roast_level)} {ROAST_LABELS[coffee.roast_level] ?? coffee.roast_level}
                        </p>
                      </div>
                    )}
                    {coffee.process && (
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-white/30">Process</p>
                        <p className="mt-1 text-sm font-medium text-cream/80 capitalize">
                          {processEmoji(coffee.process)} {PROCESS_LABELS[coffee.process] ?? coffee.process}
                        </p>
                      </div>
                    )}
                    {coffee.acidity_score != null && coffee.acidity_score >= 8 && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3.5">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-amber-400/60">Best Method</p>
                        <p className="mt-1 text-sm font-medium text-amber-300">V60 / Chemex</p>
                      </div>
                    )}
                    {coffee.body_score != null && coffee.body_score >= 8 && (
                      <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.06] p-3.5">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-purple-400/60">Best Method</p>
                        <p className="mt-1 text-sm font-medium text-purple-300">French Press / Espresso</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="text-sm font-medium text-cream/80">Recommended Parameters</p>
                    <div className="mt-3 space-y-2 text-sm text-white/60">
                      <p>• Water temperature: {coffee.roast_level === 'light' ? '93-96°C' : coffee.roast_level === 'dark' ? '88-91°C' : '90-94°C'}</p>
                      <p>• Grind: {coffee.roast_level === 'light' ? 'Medium-fine for pour-over' : coffee.roast_level === 'dark' ? 'Coarse for immersion' : 'Medium for versatility'}</p>
                      <p>• Ratio: 1:15 to 1:17 (filter) or 1:2 (espresso)</p>
                      {coffee.process === 'natural' && (
                        <p>• Tip: Natural process coffees are more soluble — start with a slightly coarser grind</p>
                      )}
                      {coffee.process === 'washed' && (
                        <p>• Tip: Washed coffees reward precise brewing — consistent technique reveals their clarity</p>
                      )}
                    </div>
                  </div>
                </div>

                <Link
                  href="/brewno/demleme-rehberi"
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] py-3 text-sm text-white/50 transition-colors hover:border-amber-500/30 hover:text-amber-400"
                >
                  View Full Brew Guides →
                </Link>
              </div>
            )}
          </div>

          {/* Similar coffees */}
          {similar.length > 0 && (
            <div className="mt-12">
              <h2 className="mb-5 font-display text-xl font-medium text-cream">You Might Also Like</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {similar.slice(0, 3).map((c) => (
                  <CoffeeCard key={c.id} coffee={c} compact />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rating Modal */}
      {showRatingModal && (
        <RatingModal
          coffeeName={coffee.name}
          coffeeSlug={coffee.slug}
          onClose={() => setShowRatingModal(false)}
          onSaved={() => { setShowRatingModal(false); fetchData(); }}
        />
      )}
    </>
  );
}
