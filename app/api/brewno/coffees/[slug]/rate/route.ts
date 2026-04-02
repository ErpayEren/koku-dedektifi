import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  // Extract user from Authorization header (JWT)
  const authHeader = request.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get coffee id from slug
  const { data: coffee, error: coffeeError } = await supabase
    .from('coffees')
    .select('id')
    .eq('slug', params.slug)
    .single();

  if (coffeeError || !coffee) {
    return NextResponse.json({ error: 'Coffee not found' }, { status: 404 });
  }

  const body = await request.json();
  const {
    overall_score,
    acidity_score,
    sweetness_score,
    body_score,
    bitterness_score,
    aroma_score,
    review_text,
    brew_method,
    brew_recipe,
    liked_notes,
  } = body;

  if (!overall_score || overall_score < 1 || overall_score > 5) {
    return NextResponse.json({ error: 'overall_score must be 1-5' }, { status: 400 });
  }

  const { data: rating, error: ratingError } = await supabase
    .from('coffee_ratings')
    .upsert(
      {
        coffee_id: coffee.id,
        user_id: user.id,
        overall_score,
        acidity_score: acidity_score ?? null,
        sweetness_score: sweetness_score ?? null,
        body_score: body_score ?? null,
        bitterness_score: bitterness_score ?? null,
        aroma_score: aroma_score ?? null,
        review_text: review_text ?? null,
        brew_method: brew_method ?? null,
        brew_recipe: brew_recipe ?? {},
        liked_notes: liked_notes ?? [],
      },
      { onConflict: 'coffee_id,user_id' },
    )
    .select()
    .single();

  if (ratingError) {
    console.error('[Brewno] rating upsert error:', ratingError);
    return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 });
  }

  // Log activity
  await supabase.from('brewno_activity').insert({
    user_id: user.id,
    type: 'rated',
    coffee_id: coffee.id,
    payload: { overall_score, brew_method },
  });

  return NextResponse.json({ rating });
}
