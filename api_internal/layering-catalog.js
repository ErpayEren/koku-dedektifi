const { createClient } = require('@supabase/supabase-js');
const { cleanString, setCorsHeaders, setSecurityHeaders } = require('../lib/server/config');
const { resolveSupabaseConfig } = require('../lib/server/supabase-config');

function parseLimit(raw) {
  const value = Number.parseInt(cleanString(raw) || '60', 10);
  if (!Number.isFinite(value)) return 60;
  return Math.max(10, Math.min(150, value));
}

function parseQuery(req) {
  const query = req?.query && typeof req.query === 'object' ? req.query : {};
  const q = cleanString(query.q || '');
  const limit = parseLimit(query.limit);
  return { q, limit };
}

module.exports = async function layeringCatalogHandler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res, { methods: 'GET, OPTIONS', headers: 'Content-Type' })) {
    return res.status(403).json({ error: 'Bu origin için erişim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { q, limit } = parseQuery(req);
    const config = resolveSupabaseConfig();
    const table =
      cleanString(process.env.SUPABASE_FRAGRANCES_TABLE) ||
      cleanString(process.env.SUPABASE_PERFUMES_TABLE) ||
      'fragrances';

    if (!config.url || !config.serviceRoleKey) {
      return res.status(200).json({ options: [] });
    }

    const supabase = createClient(config.url, config.serviceRoleKey, {
      auth: { persistSession: false },
    });

    let query = supabase
      .from(table)
      .select('name,brand,year')
      .not('name', 'is', null)
      .limit(limit);

    if (q) {
      const tokens = q
        .toLowerCase()
        .split(/\s+/)
        .map((item) => cleanString(item))
        .filter((item) => item.length >= 2)
        .slice(0, 4);
      const ilikes = [];
      tokens.forEach((token) => {
        ilikes.push(`name.ilike.%${token}%`);
        ilikes.push(`brand.ilike.%${token}%`);
      });
      if (ilikes.length > 0) {
        query = query.or(ilikes.join(','));
      }
    } else {
      query = query.order('year', { ascending: false, nullsFirst: false });
    }

    const { data, error } = await query;
    if (error || !Array.isArray(data)) {
      return res.status(200).json({ options: [] });
    }

    const seen = new Set();
    const options = data
      .map((row) => {
        const name = cleanString(row?.name);
        if (!name) return null;
        const brand = cleanString(row?.brand);
        const label = brand ? `${brand} ${name}` : name;
        const key = label.toLowerCase();
        if (seen.has(key)) return null;
        seen.add(key);
        return label;
      })
      .filter(Boolean)
      .slice(0, limit);

    return res.status(200).json({ options });
  } catch (error) {
    console.error('[layering-catalog] failed:', error);
    return res.status(500).json({ error: 'Katalog seçenekleri alınamadı.' });
  }
};

