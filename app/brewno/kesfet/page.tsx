'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { CoffeeCard } from '@/components/brewno/CoffeeCard';
import { FlavorNoteTag } from '@/components/brewno/FlavorNoteTag';
import type { Coffee } from '@/lib/brewno';
import { ROAST_LABELS, PROCESS_LABELS } from '@/lib/brewno';

const POPULAR_NOTES = ['blueberry', 'chocolate', 'caramel', 'jasmine', 'citrus', 'honey', 'rose', 'black tea', 'hazelnut', 'tropical fruit'];

export default function KesfetPage() {
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [results, setResults] = useState<Coffee[]>([]);
  const [allCoffees, setAllCoffees] = useState<Coffee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Filters
  const [roastFilter, setRoastFilter] = useState(searchParams.get('roast') ?? '');
  const [processFilter, setProcessFilter] = useState(searchParams.get('process') ?? '');
  const [countryFilter, setCountryFilter] = useState(searchParams.get('country') ?? '');
  const [noteFilters, setNoteFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('brew_score');

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAllCoffees = useCallback(async () => {
    const params = new URLSearchParams({ sort: sortBy, limit: '40' });
    if (roastFilter) params.set('roast', roastFilter);
    if (processFilter) params.set('process', processFilter);
    if (countryFilter) params.set('country', countryFilter);
    const res = await fetch(`/api/brewno/coffees?${params}`);
    if (res.ok) {
      const data = await res.json();
      let coffees = (data.coffees ?? []) as Coffee[];
      // Filter by notes client-side
      if (noteFilters.length > 0) {
        coffees = coffees.filter((c) =>
          noteFilters.every((n) => c.flavor_notes.includes(n))
        );
      }
      setAllCoffees(coffees);
    }
  }, [sortBy, roastFilter, processFilter, countryFilter, noteFilters]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearched(false);
      setResults([]);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/brewno/search?q=${encodeURIComponent(q)}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllCoffees();
  }, [fetchAllCoffees]);

  useEffect(() => {
    if (query) {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(() => doSearch(query), 350);
    } else {
      setSearched(false);
      setResults([]);
    }
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [query, doSearch]);

  const displayedCoffees = searched ? results : allCoffees;

  const toggleNote = (note: string) => {
    setNoteFilters((prev) =>
      prev.includes(note) ? prev.filter((n) => n !== note) : [...prev, note]
    );
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-medium text-cream">Explore Coffees</h1>
        <p className="mt-1 text-sm text-white/50">Search, filter, and discover specialty coffees worldwide</p>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
          <svg className="h-5 w-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search coffees, roasters, origins, flavor notes…"
          className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] py-3.5 pl-11 pr-4 text-sm text-white/80 placeholder:text-white/25 outline-none focus:border-amber-500/40 focus:bg-white/[0.06] transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-4 flex items-center text-white/30 hover:text-white/60 transition-colors"
          >
            ×
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="mb-4 flex flex-wrap gap-2">
        {/* Roast filter */}
        <select
          value={roastFilter}
          onChange={(e) => setRoastFilter(e.target.value)}
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white/60 outline-none focus:border-amber-500/30 cursor-pointer"
        >
          <option value="">All Roasts</option>
          {Object.entries(ROAST_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        {/* Process filter */}
        <select
          value={processFilter}
          onChange={(e) => setProcessFilter(e.target.value)}
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white/60 outline-none focus:border-amber-500/30 cursor-pointer"
        >
          <option value="">All Processes</option>
          {Object.entries(PROCESS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        {/* Country filter */}
        <select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white/60 outline-none focus:border-amber-500/30 cursor-pointer"
        >
          <option value="">All Origins</option>
          {['Ethiopia', 'Colombia', 'Kenya', 'Panama', 'Brazil', 'Guatemala', 'Yemen', 'Indonesia', 'Rwanda', 'Costa Rica', 'Taiwan', 'Peru', 'Honduras', 'Burundi', 'Mexico', 'Tanzania', 'USA'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white/60 outline-none focus:border-amber-500/30 cursor-pointer"
        >
          <option value="brew_score">Best BrewScore</option>
          <option value="community_rating_avg">Highest Rated</option>
          <option value="community_rating_count">Most Rated</option>
          <option value="created_at">Newest</option>
          <option value="price_per_100g">Price</option>
        </select>

        {/* Clear filters */}
        {(roastFilter || processFilter || countryFilter || noteFilters.length > 0) && (
          <button
            type="button"
            onClick={() => { setRoastFilter(''); setProcessFilter(''); setCountryFilter(''); setNoteFilters([]); }}
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Popular flavor note chips */}
      {!searched && (
        <div className="mb-6">
          <p className="mb-2 text-[11px] uppercase tracking-[0.15em] text-white/30">Filter by Flavor</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_NOTES.map((note) => (
              <FlavorNoteTag
                key={note}
                note={note}
                size="sm"
                active={noteFilters.includes(note)}
                onClick={() => toggleNote(note)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-white/40">
          {loading ? 'Searching…' : (
            searched
              ? `${displayedCoffees.length} result${displayedCoffees.length !== 1 ? 's' : ''} for "${query}"`
              : `${displayedCoffees.length} coffee${displayedCoffees.length !== 1 ? 's' : ''}`
          )}
        </p>
      </div>

      {/* Coffee grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-amber-500/20 border-t-amber-500" />
        </div>
      ) : displayedCoffees.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-white/50">
            {searched ? `No results found for "${query}"` : 'No coffees match your filters'}
          </p>
          {searched && (
            <p className="mt-1 text-sm text-white/30">Try a different search term or origin</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayedCoffees.map((coffee) => (
            <CoffeeCard key={coffee.id} coffee={coffee} />
          ))}
        </div>
      )}
    </div>
  );
}
