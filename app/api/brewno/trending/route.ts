import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(20, parseInt(searchParams.get('limit') ?? '10', 10));

  // Trending = highest community_rating_count in last 30 days (approximated by ratings count)
  const { data, error } = await supabase
    .from('coffees')
    .select('*')
    .eq('available', true)
    .gte('community_rating_count', 1)
    .order('community_rating_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Brewno] trending error:', error);
    return NextResponse.json({ error: 'Failed to fetch trending' }, { status: 500 });
  }

  return NextResponse.json({ trending: data ?? [] });
}
