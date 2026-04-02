import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roast = searchParams.get('roast');
  const process = searchParams.get('process');
  const country = searchParams.get('country');
  const minScore = searchParams.get('minScore');
  const sort = searchParams.get('sort') ?? 'brew_score';
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10));
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  let query = supabase
    .from('coffees')
    .select('*', { count: 'exact' })
    .eq('available', true);

  if (roast) query = query.eq('roast_level', roast);
  if (process) query = query.eq('process', process);
  if (country) query = query.eq('origin_country', country);
  if (minScore) query = query.gte('brew_score', parseFloat(minScore));

  const allowedSorts = ['brew_score', 'community_rating_avg', 'community_rating_count', 'created_at', 'price_per_100g'];
  const sortField = allowedSorts.includes(sort) ? sort : 'brew_score';
  query = query.order(sortField, { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error('[Brewno] coffees list error:', error);
    return NextResponse.json({ error: 'Failed to fetch coffees' }, { status: 500 });
  }

  return NextResponse.json({ coffees: data ?? [], total: count ?? 0 });
}
