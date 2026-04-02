'use client';

import { useState, useEffect } from 'react';
import { BrewGuideCard } from '@/components/brewno/BrewGuideCard';
import type { BrewGuide } from '@/lib/brewno';

const METHOD_ICONS: Record<string, string> = {
  v60:           '🌀',
  espresso:      '⚡',
  aeropress:     '🔬',
  'french-press':'🫖',
  chemex:        '⚗️',
  'moka-pot':    '🍵',
  'cold-brew':   '🧊',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner:     'Beginner',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
};

export default function DemlemeRehberiPage() {
  const [guides, setGuides] = useState<BrewGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    fetch('/api/brewno/brew-guides')
      .then((res) => res.ok ? res.json() : { guides: [] })
      .then((data) => setGuides(data.guides ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter
    ? guides.filter((g) => g.difficulty === filter)
    : guides;

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-medium text-cream">Brew Guides</h1>
        <p className="mt-1 text-sm text-white/50">
          Step-by-step brewing guides for every method — from beginner to barista-level.
        </p>
      </div>

      {/* Method quick-links */}
      {!loading && guides.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {guides.map((g) => (
            <a
              key={g.id}
              href={`#${g.method}`}
              className="flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-sm text-white/60 transition-all hover:border-amber-500/30 hover:text-amber-300"
            >
              <span>{METHOD_ICONS[g.method] ?? '☕'}</span>
              {g.name}
            </a>
          ))}
        </div>
      )}

      {/* Difficulty filter */}
      <div className="mb-6 flex gap-2">
        {['', 'beginner', 'intermediate', 'advanced'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setFilter(d)}
            className={`rounded-full px-3 py-1.5 text-xs transition-all ${
              filter === d
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'border border-white/[0.07] bg-white/[0.03] text-white/50 hover:bg-white/[0.06]'
            }`}
          >
            {d ? (DIFFICULTY_LABELS[d] ?? d) : 'All Methods'}
          </button>
        ))}
      </div>

      {/* Guides list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500/20 border-t-amber-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-white/50">
          <p className="text-4xl mb-3">☕</p>
          <p>No brew guides found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((guide) => (
            <div key={guide.id} id={guide.method}>
              <BrewGuideCard guide={guide} />
            </div>
          ))}
        </div>
      )}

      {/* Tips section */}
      <div className="mt-10 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
        <h3 className="mb-4 font-display text-lg font-medium text-cream">Universal Brewing Principles</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { icon: '💧', title: 'Water Quality', tip: 'Use filtered water. Mineral content significantly affects extraction. Target ~150 TDS.' },
            { icon: '⚖️', title: 'Consistency', tip: 'A digital scale (0.1g precision) transforms your brewing. Volume measurements lie.' },
            { icon: '🌡', title: 'Temperature', tip: 'Light roasts need hotter water (93-96°C). Dark roasts: 88-91°C. Grind finer for more extraction.' },
            { icon: '⏱', title: 'Freshness', tip: 'Use coffee within 2-4 weeks of roast. Degassing CO₂ continues for days after roasting.' },
            { icon: '🫙', title: 'Storage', tip: 'Airtight container at room temperature. Avoid fridge — condensation harms the beans.' },
            { icon: '🔬', title: 'Grind to Order', tip: 'Grind immediately before brewing. Pre-ground coffee stales 15× faster than whole bean.' },
          ].map((item) => (
            <div key={item.title} className="flex gap-3">
              <span className="text-2xl shrink-0">{item.icon}</span>
              <div>
                <p className="text-sm font-medium text-cream/80">{item.title}</p>
                <p className="text-xs leading-relaxed text-white/50">{item.tip}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
