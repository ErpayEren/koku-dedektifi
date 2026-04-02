import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('brew_guides')
    .select('*')
    .order('difficulty', { ascending: true });

  if (error) {
    console.error('[Brewno] brew guides error:', error);
    return NextResponse.json({ error: 'Failed to fetch guides' }, { status: 500 });
  }

  return NextResponse.json({ guides: data ?? [] });
}
