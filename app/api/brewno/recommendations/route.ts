import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import {
  type Coffee,
  type UserTasteProfile,
  contentBasedScore,
  coffeeSimilarityScore,
} from '@/lib/brewno';

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(20, parseInt(searchParams.get('limit') ?? '10', 10));

  // Try to get authenticated user for personalised recs
  const authHeader = request.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  let tasteProfile: UserTasteProfile | null = null;
  let ratedCoffeeIds: string[] = [];

  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      const [profileResult, ratingsResult] = await Promise.all([
        supabase
          .from('user_taste_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('coffee_ratings')
          .select('coffee_id')
          .eq('user_id', user.id),
      ]);
      tasteProfile = profileResult.data;
      ratedCoffeeIds = (ratingsResult.data ?? []).map((r: { coffee_id: string }) => r.coffee_id);
    }
  }

  // Fetch all available coffees
  const { data: allCoffees } = await supabase
    .from('coffees')
    .select('*')
    .eq('available', true)
    .order('brew_score', { ascending: false });

  const coffees = (allCoffees ?? []) as Coffee[];

  // Filter out already-rated coffees
  const candidates = coffees.filter((c) => !ratedCoffeeIds.includes(c.id));

  let recommendations: Array<Coffee & { match_score: number; match_reasons: string[] }>;

  if (tasteProfile && tasteProfile.quiz_completed) {
    // Content-based recommendation
    const scored = candidates.map((coffee) => {
      const { score, reasons } = contentBasedScore(coffee, tasteProfile);
      return { ...coffee, match_score: score, match_reasons: reasons };
    });
    scored.sort((a, b) => b.match_score - a.match_score);
    recommendations = scored.slice(0, limit);
  } else {
    // Fallback: top-rated coffees with no personalisation
    recommendations = candidates.slice(0, limit).map((c) => ({
      ...c,
      match_score: Math.round((c.community_rating_avg ?? 3) * 20),
      match_reasons: ['Highly rated by the community'],
    }));
  }

  return NextResponse.json({
    recommendations,
    personalised: tasteProfile?.quiz_completed ?? false,
  });
}

export async function POST(request: NextRequest) {
  // Collaborative filtering: get similar-user recommendations
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const authHeader = request.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { coffee_id } = body as { coffee_id: string };

  // Find users who rated this coffee highly (>=4)
  const { data: highRaters } = await supabase
    .from('coffee_ratings')
    .select('user_id')
    .eq('coffee_id', coffee_id)
    .gte('overall_score', 4)
    .neq('user_id', user.id)
    .limit(50);

  const similarUserIds = (highRaters ?? []).map((r: { user_id: string }) => r.user_id);

  if (similarUserIds.length === 0) {
    return NextResponse.json({ similar: [] });
  }

  // Get what those similar users loved (rated >= 4.5)
  const { data: similarRatings } = await supabase
    .from('coffee_ratings')
    .select('coffee_id, overall_score')
    .in('user_id', similarUserIds)
    .gte('overall_score', 4.5)
    .neq('coffee_id', coffee_id)
    .neq('user_id', user.id);

  // Aggregate: count how many similar users loved each coffee
  const coffeePopularity: Record<string, number> = {};
  for (const r of (similarRatings ?? [])) {
    coffeePopularity[r.coffee_id] = (coffeePopularity[r.coffee_id] ?? 0) + 1;
  }

  const topCoffeeIds = Object.entries(coffeePopularity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([id]) => id);

  if (topCoffeeIds.length === 0) {
    // Fallback: content-based similarity
    const { data: baseCoffee } = await supabase.from('coffees').select('*').eq('id', coffee_id).single();
    const { data: allCoffees } = await supabase.from('coffees').select('*').eq('available', true);
    if (baseCoffee && allCoffees) {
      const similar = (allCoffees as Coffee[])
        .filter((c) => c.id !== coffee_id)
        .map((c) => ({ ...c, similarity: coffeeSimilarityScore(baseCoffee as Coffee, c) }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);
      return NextResponse.json({ similar });
    }
    return NextResponse.json({ similar: [] });
  }

  const { data: similar } = await supabase
    .from('coffees')
    .select('*')
    .in('id', topCoffeeIds);

  return NextResponse.json({ similar: similar ?? [] });
}
