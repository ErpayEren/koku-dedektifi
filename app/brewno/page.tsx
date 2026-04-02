'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CoffeeCard } from '@/components/brewno/CoffeeCard';
import { BrewScoreRing } from '@/components/brewno/BrewScoreRing';
import type { Coffee, RecommendedCoffee } from '@/lib/brewno';

interface TrendingCoffee extends Coffee {
  rank?: number;
}

export default function BrewnoHomePage() {
  const [trending, setTrending] = useState<TrendingCoffee[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedCoffee[]>([]);
  const [featuredCoffee, setFeaturedCoffee] = useState<Coffee | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [trendRes, recRes] = await Promise.all([
        fetch('/api/brewno/trending?limit=8'),
        fetch('/api/brewno/recommendations?limit=6'),
      ]);

      if (trendRes.ok) {
        const data = await trendRes.json();
        const coffees = (data.trending ?? []) as TrendingCoffee[];
        setTrending(coffees);
        if (coffees.length > 0) setFeaturedCoffee(coffees[0]);
      }

      if (recRes.ok) {
        const data = await recRes.json();
        setRecommendations(data.recommendations ?? []);
      }
    } catch (err) {
      console.error('[Brewno] home fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-amber-500/20 border-t-amber-500" />
          <p className="text-sm text-white/40">Brewing discoveries…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 px-4 py-8 sm:px-6 lg:px-8">

      {/* Hero — Featured Coffee */}
      {featuredCoffee && (
        <section>
          <Link
            href={`/brewno/kahve/${featuredCoffee.slug}`}
            className="group relative flex min-h-[320px] overflow-hidden rounded-3xl border border-white/[0.08]"
          >
            {/* Background image */}
            {featuredCoffee.cover_image_url && (
              <img
                src={featuredCoffee.cover_image_url}
                alt={featuredCoffee.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Content */}
            <div className="relative flex flex-1 flex-col justify-end p-8">
              <div className="max-w-lg">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-amber-400">
                    ✦ Featured
                  </span>
                </div>
                <p className="text-[12px] uppercase tracking-[0.2em] text-amber-400/80">
                  {featuredCoffee.roaster}
                </p>
                <h1 className="mt-1 font-display text-3xl font-medium text-cream md:text-4xl">
                  {featuredCoffee.name}
                </h1>
                <p className="mt-2 text-sm text-white/60 line-clamp-2">
                  {featuredCoffee.description}
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <BrewScoreRing score={featuredCoffee.brew_score} size={52} showLabel />
                  <div>
                    <p className="text-xs text-white/40">Community</p>
                    <p className="font-medium text-cream">
                      {featuredCoffee.community_rating_avg?.toFixed(1)} ★
                      <span className="ml-1 text-xs text-white/40">
                        ({featuredCoffee.community_rating_count} ratings)
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Origin</p>
                    <p className="text-sm text-cream/80">
                      {[featuredCoffee.origin_region, featuredCoffee.origin_country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Taste profile CTA */}
      <section>
        <div className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5">
          <div>
            <h3 className="font-medium text-cream">Discover your taste profile</h3>
            <p className="mt-0.5 text-sm text-white/50">
              Take a 2-minute quiz to get personalised coffee recommendations.
            </p>
          </div>
          <Link
            href="/brewno/tat-testi"
            className="shrink-0 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-black transition-all hover:bg-amber-400 active:scale-95"
          >
            Start Quiz →
          </Link>
        </div>
      </section>

      {/* Personalised Recommendations */}
      {recommendations.length > 0 && (
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-medium text-cream">For You</h2>
              <p className="mt-0.5 text-sm text-white/40">Based on your taste preferences</p>
            </div>
            <Link href="/brewno/kesfet" className="text-sm text-amber-400/80 hover:text-amber-400 transition-colors">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((coffee) => (
              <CoffeeCard
                key={coffee.id}
                coffee={coffee}
                matchScore={coffee.match_score}
                matchReasons={coffee.match_reasons}
              />
            ))}
          </div>
        </section>
      )}

      {/* Trending */}
      {trending.length > 1 && (
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-medium text-cream">Trending Now</h2>
              <p className="mt-0.5 text-sm text-white/40">Most rated by the community</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {trending.slice(1).map((coffee, i) => (
              <div key={coffee.id} className="relative">
                <div className="absolute -left-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
                  {i + 2}
                </div>
                <CoffeeCard coffee={coffee} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Origins map teaser */}
      <section>
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
          <h2 className="mb-1 font-display text-lg font-medium text-cream">Explore by Origin</h2>
          <p className="mb-5 text-sm text-white/40">Journey through coffee-growing regions of the world</p>
          <div className="flex flex-wrap gap-2">
            {['Ethiopia', 'Colombia', 'Kenya', 'Panama', 'Brazil', 'Guatemala', 'Yemen', 'Indonesia', 'Rwanda', 'Costa Rica', 'Taiwan', 'Peru', 'Honduras', 'Burundi', 'Mexico', 'Tanzania'].map((country) => (
              <Link
                key={country}
                href={`/brewno/kesfet?country=${encodeURIComponent(country)}`}
                className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-white/60 transition-all hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-300"
              >
                {country}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Brew guides teaser */}
      <section>
        <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
          <div>
            <h2 className="font-display text-lg font-medium text-cream">Master Your Brew</h2>
            <p className="mt-0.5 text-sm text-white/40">Step-by-step guides for every method</p>
            <div className="mt-3 flex gap-2">
              {['V60', 'Espresso', 'AeroPress', 'French Press', 'Cold Brew'].map((m) => (
                <span key={m} className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-xs text-white/50">
                  {m}
                </span>
              ))}
            </div>
          </div>
          <Link
            href="/brewno/demleme-rehberi"
            className="shrink-0 rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm text-white/60 transition-all hover:border-amber-500/30 hover:text-amber-400"
          >
            View Guides →
          </Link>
        </div>
      </section>
    </div>
  );
}
