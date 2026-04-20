const { setCorsHeaders, setSecurityHeaders } = require('../lib/server/config');
const { getSupabase } = require('../lib/supabase');

const PAGE_SIZE = 24;

async function searchPerfumes(q, filters, page) {
  const supabase = getSupabase();
  if (!supabase) return { results: [], total: 0 };

  const offset = (page - 1) * PAGE_SIZE;
  let query = supabase
    .from('perfumes')
    .select(
      'id, name, brand, gender, rating, top_notes, heart_notes, base_notes, cover_image_url, price_tier, popularity_score',
      { count: 'exact' },
    )
    .order('popularity_score', { ascending: false })
    .order('rating', { ascending: false, nullsFirst: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (q) {
    query = query.textSearch('name', q, { type: 'websearch', config: 'simple' });
  }
  if (filters.gender) query = query.eq('gender', filters.gender);
  if (filters.brand) query = query.ilike('brand', `%${filters.brand}%`);
  if (filters.priceTier) query = query.eq('price_tier', filters.priceTier);

  const { data, error, count } = await query;
  if (error) {
    console.error('[perfumes] search error:', error);
    return { results: [], total: 0 };
  }
  return { results: data ?? [], total: count ?? 0 };
}

async function getTrending() {
  const supabase = getSupabase();
  if (!supabase) return [];

  // Try materialized view first, fall back to rating-based list
  const { data, error } = await supabase
    .from('trending_perfumes')
    .select('*')
    .order('analysis_count_7d', { ascending: false })
    .limit(20);

  if (!error && data?.length) return data;

  const { data: fallback } = await supabase
    .from('perfumes')
    .select('id, name, brand, gender, rating, top_notes, cover_image_url, price_tier')
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(20);

  return fallback ?? [];
}

module.exports = async function perfumesHandler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res, { methods: 'GET, OPTIONS', headers: 'Content-Type' })) {
    return res.status(403).json({ error: 'Bu origin için erişim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const query = req.query ?? {};
  const mode = String(query.mode || 'search').trim();

  if (mode === 'trending') {
    const results = await getTrending();
    return res.status(200).json({ trending: results });
  }

  const q = String(query.q || '').trim().slice(0, 100);
  const filters = {
    gender: String(query.gender || '').trim().slice(0, 20) || undefined,
    brand: String(query.brand || '').trim().slice(0, 60) || undefined,
    priceTier: String(query.price_tier || '').trim().slice(0, 20) || undefined,
  };
  const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);

  const { results, total } = await searchPerfumes(q || undefined, filters, page);
  return res.status(200).json({ results, total, page, pageSize: PAGE_SIZE });
};
