import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const { data: coffee, error } = await supabase
    .from('coffees')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (error || !coffee) {
    return NextResponse.json({ error: 'Coffee not found' }, { status: 404 });
  }

  // Fetch ratings with profile info
  const { data: ratings } = await supabase
    .from('coffee_ratings')
    .select(`
      id, overall_score, acidity_score, sweetness_score, body_score,
      bitterness_score, aroma_score, review_text, brew_method, liked_notes, created_at,
      brewno_profiles (username, display_name, avatar_url)
    `)
    .eq('coffee_id', coffee.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return NextResponse.json({ coffee, ratings: ratings ?? [] });
}
