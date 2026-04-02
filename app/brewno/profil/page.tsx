'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { TasteRadar } from '@/components/brewno/TasteRadar';
import type { UserTasteProfile } from '@/lib/brewno';
import { ROAST_LABELS, PROCESS_LABELS } from '@/lib/brewno';

// Mock profile data for unauthenticated demo

export default function ProfilPage() {
  const [tasteProfile, setTasteProfile] = useState<UserTasteProfile | null>(null);
  const [isAuthenticated] = useState(false); // Would use real auth in production

  const fetchProfile = useCallback(async () => {
    try {
      // In a real app, use the actual session token
      const res = await fetch('/api/brewno/taste-profile', {
        headers: { Authorization: 'Bearer demo' },
      });
      if (res.ok) {
        const data = await res.json();
        setTasteProfile(data.profile);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-medium text-cream">Profile</h1>
      </div>

      {!isAuthenticated ? (
        /* Unauthenticated state */
        <div className="space-y-6">
          {/* Profile card skeleton */}
          <div className="overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.02]">
            <div className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:text-left">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-4xl">
                👤
              </div>
              <div className="flex-1">
                <h2 className="font-display text-xl text-cream">Guest Explorer</h2>
                <p className="mt-1 text-sm text-white/40">Sign in to track your coffee journey</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-center">
                    <p className="text-2xl font-bold text-cream">0</p>
                    <p className="text-xs text-white/40">Ratings</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-center">
                    <p className="text-2xl font-bold text-cream">0</p>
                    <p className="text-xs text-white/40">Wishlist</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-center">
                    <p className="text-2xl font-bold text-cream">0</p>
                    <p className="text-xs text-white/40">Following</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sign-in CTA */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-6 text-center">
            <p className="text-lg font-medium text-cream">Track Your Coffee Journey</p>
            <p className="mt-2 text-sm text-white/50">
              Sign in to rate coffees, save your wishlist, follow other enthusiasts, and get personalized recommendations.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/brewno/tat-testi"
                className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-black transition-all hover:bg-amber-400 active:scale-95"
              >
                Start Taste Quiz
              </Link>
              <Link
                href="/brewno/kesfet"
                className="rounded-xl border border-white/[0.1] px-6 py-3 text-sm text-white/60 transition-all hover:border-white/[0.2] hover:text-white/80"
              >
                Explore Coffees
              </Link>
            </div>
          </div>

          {/* Taste profile section */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-cream">Your Taste Profile</h3>
              {tasteProfile?.quiz_completed ? (
                <Link href="/brewno/tat-testi" className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors">
                  Retake Quiz →
                </Link>
              ) : (
                <Link href="/brewno/tat-testi" className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors">
                  Take Quiz →
                </Link>
              )}
            </div>

            {tasteProfile?.quiz_completed ? (
              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  {/* Preferences summary */}
                  <div className="space-y-3">
                    {tasteProfile.preferred_roast.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-white/30">Preferred Roast</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {tasteProfile.preferred_roast.map((r) => (
                            <span key={r} className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs text-amber-300">
                              {ROAST_LABELS[r] ?? r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {tasteProfile.preferred_process.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-white/30">Preferred Process</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {tasteProfile.preferred_process.map((p) => (
                            <span key={p} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-white/60">
                              {PROCESS_LABELS[p] ?? p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {tasteProfile.preferred_notes.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-white/30">Favourite Notes</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {tasteProfile.preferred_notes.slice(0, 8).map((n) => (
                            <span key={n} className="rounded-full bg-white/[0.05] px-2.5 py-1 text-xs capitalize text-white/60">
                              {n}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-center">
                  <TasteRadar
                    acidity={tasteProfile.acidity_pref}
                    sweetness={tasteProfile.sweetness_pref}
                    body={tasteProfile.body_pref}
                    bitterness={tasteProfile.bitterness_pref}
                    aroma={7}
                    size={200}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-white/[0.1] py-8 text-center">
                <p className="text-3xl mb-2">☕</p>
                <p className="text-sm text-white/40">Complete the taste quiz to see your profile</p>
                <Link
                  href="/brewno/tat-testi"
                  className="mt-3 inline-block rounded-xl bg-amber-500/20 px-4 py-2 text-sm text-amber-400 hover:bg-amber-500/30 transition-colors"
                >
                  Take the 2-minute quiz →
                </Link>
              </div>
            )}
          </div>

          {/* Features preview */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: '★', title: 'Rate & Review', desc: 'Score coffees and share your tasting notes with the community.' },
              { icon: '♥', title: 'Wishlist', desc: 'Save coffees you want to try and never lose track of a great find.' },
              { icon: '◎', title: 'Follow Friends', desc: 'See what coffee enthusiasts you follow are discovering and rating.' },
            ].map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                <div className="mb-3 text-2xl text-amber-400/70">{feature.icon}</div>
                <h4 className="font-medium text-cream">{feature.title}</h4>
                <p className="mt-1 text-sm text-white/50">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Authenticated state — full profile */
        <div className="space-y-6">
          <p className="text-white/50">Profile loaded.</p>
        </div>
      )}
    </div>
  );
}
