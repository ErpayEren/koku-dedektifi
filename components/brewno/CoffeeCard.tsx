'use client';

import Link from 'next/link';
import { type Coffee as CoffeeType, brewScoreColor, ROAST_LABELS, PROCESS_LABELS, roastLevelEmoji } from '@/lib/brewno';
import { BrewScoreRing } from './BrewScoreRing';

interface CoffeeCardProps {
  coffee: CoffeeType;
  matchScore?: number;
  matchReasons?: string[];
  compact?: boolean;
}

export function CoffeeCard({ coffee, matchScore, matchReasons, compact = false }: CoffeeCardProps) {
  return (
    <Link
      href={`/brewno/kahve/${coffee.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.12] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      {/* Cover image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-white/[0.04]">
        {coffee.cover_image_url ? (
          <img
            src={coffee.cover_image_url}
            alt={coffee.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl opacity-30">☕</div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Roast badge */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 backdrop-blur-sm">
          <span className="text-sm">{roastLevelEmoji(coffee.roast_level)}</span>
          <span className="text-[11px] font-medium text-white/80">
            {coffee.roast_level ? (ROAST_LABELS[coffee.roast_level] ?? coffee.roast_level) : '—'}
          </span>
        </div>

        {/* Match score pill */}
        {matchScore != null && (
          <div
            className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm"
            style={{ background: `${brewScoreColor(matchScore)}22`, color: brewScoreColor(matchScore), border: `1px solid ${brewScoreColor(matchScore)}44` }}
          >
            {matchScore}% match
          </div>
        )}

        {/* BrewScore on image bottom-right */}
        <div className="absolute bottom-3 right-3">
          <BrewScoreRing score={coffee.brew_score} size={44} />
        </div>
      </div>

      {/* Content */}
      <div className={`flex flex-1 flex-col ${compact ? 'gap-1 p-3' : 'gap-2 p-4'}`}>
        {/* Roaster */}
        <p className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-amber-400/80">
          {coffee.roaster ?? 'Unknown Roaster'}
        </p>

        {/* Name */}
        <h3 className={`font-display font-medium leading-tight text-cream group-hover:text-amber-100 transition-colors ${compact ? 'text-sm' : 'text-base'}`}>
          {coffee.name}
        </h3>

        {/* Origin */}
        <p className="text-[12px] text-white/50">
          {[coffee.origin_region, coffee.origin_country].filter(Boolean).join(', ') || '—'}
        </p>

        {!compact && (
          <>
            {/* Flavor notes */}
            {coffee.flavor_notes.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {coffee.flavor_notes.slice(0, 4).map((note) => (
                  <span
                    key={note}
                    className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] capitalize text-white/60"
                  >
                    {note}
                  </span>
                ))}
              </div>
            )}

            {/* Match reasons */}
            {matchReasons && matchReasons.length > 0 && (
              <p className="mt-1 text-[11px] text-amber-400/70 italic">
                {matchReasons[0]}
              </p>
            )}
          </>
        )}

        {/* Footer */}
        <div className={`flex items-center justify-between ${compact ? 'mt-1' : 'mt-2'}`}>
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold text-cream/80">
              {coffee.community_rating_avg ? coffee.community_rating_avg.toFixed(1) : '—'}
            </span>
            <span className="text-amber-400 text-xs">★</span>
            <span className="text-[11px] text-white/40">
              ({coffee.community_rating_count ?? 0})
            </span>
          </div>
          {coffee.process && (
            <span className="text-[11px] capitalize text-white/40">
              {PROCESS_LABELS[coffee.process] ?? coffee.process}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
