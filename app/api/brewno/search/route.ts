import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();
  const limit = Math.min(30, parseInt(searchParams.get('limit') ?? '12', 10));

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  // Full-text + trigram search across name, roaster, origin, flavor notes
  const { data: results, error } = await supabase
    .from('coffees')
    .select('id, slug, name, roaster, origin_country, origin_region, roast_level, process, flavor_notes, brew_score, community_rating_avg, community_rating_count, cover_image_url, price_per_100g')
    .or(
      `name.ilike.%${q}%,roaster.ilike.%${q}%,origin_country.ilike.%${q}%,origin_region.ilike.%${q}%`,
    )
    .eq('available', true)
    .order('brew_score', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Brewno] search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  // Also search by flavor notes (array overlap)
  const { data: noteResults } = await supabase
    .from('coffees')
    .select('id, slug, name, roaster, origin_country, origin_region, roast_level, process, flavor_notes, brew_score, community_rating_avg, community_rating_count, cover_image_url, price_per_100g')
    .contains('flavor_notes', [q.toLowerCase()])
    .eq('available', true)
    .order('brew_score', { ascending: false })
    .limit(6);

  // Merge & deduplicate
  const seen = new Set<string>();
  const merged = [...(results ?? []), ...(noteResults ?? [])].filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  return NextResponse.json({ results: merged.slice(0, limit), query: q });
}
