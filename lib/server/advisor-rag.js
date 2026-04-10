const { PERFUME_CATALOG, normalizeText } = require('./perfume-knowledge');

const DEFAULT_TOP_K = 5;
const MAX_CONTEXT_ITEMS = 6;
const MAX_CONTEXT_CHARS = 2600;

const INTENT_TOKEN_GROUPS = {
  office: ['ofis', 'office', 'is', 'work', 'calisma'],
  night: ['gece', 'night', 'date', 'aksam', 'club'],
  summer: ['yaz', 'summer', 'sicak', 'heat'],
  winter: ['kis', 'winter', 'soguk', 'cold'],
  budget: ['uygun', 'ekonomik', 'ucuz', 'butce', 'budget', 'fiyat'],
  premium: ['nis', 'niche', 'luxury', 'premium', 'luks', 'pahali'],
  profile: ['benzer', 'profil', 'signature', 'imza', 'muadil', 'dupe', 'klon'],
  trMarket: ['turkiye', 'tr', 'zara', 'lattafa', 'afnan', 'armaf', 'maison alhambra', 'fragrance world'],
};

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toUrlBase(raw) {
  const cleaned = cleanString(raw).replace(/\/+$/, '');
  if (!cleaned) return '';
  return /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
}

function tokenize(text) {
  return normalizeText(text)
    .split(' ')
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
}

function uniqueTokens(tokens) {
  return Array.from(new Set((Array.isArray(tokens) ? tokens : []).filter(Boolean)));
}

function normalizeEmbeddingVector(values, expectedDim) {
  if (!Array.isArray(values) || values.length === 0) return null;
  if (values.length === expectedDim) return values;
  if (values.length > expectedDim) return values.slice(0, expectedDim);
  return null;
}

function hasAnyToken(queryTokens, tokenGroup) {
  const set = new Set(queryTokens);
  return (Array.isArray(tokenGroup) ? tokenGroup : []).some((token) => {
    const normalized = normalizeText(token);
    if (!normalized) return false;
    if (!normalized.includes(' ')) return set.has(normalized);
    const parts = normalized.split(' ').filter(Boolean);
    return parts.length > 0 && parts.every((part) => set.has(part));
  });
}

function scoreIntentFit(queryTokens, item) {
  let score = 0;
  const itemTags = Array.isArray(item?.tags) ? item.tags.map((tag) => normalizeText(tag)) : [];
  const itemSeason = Array.isArray(item?.season) ? item.season.map((season) => normalizeText(season)) : [];
  const itemOccasion = normalizeText(item?.occasion || '');
  const priceBand = normalizeText(item?.priceBand || '');

  if (hasAnyToken(queryTokens, INTENT_TOKEN_GROUPS.office) && (itemOccasion.includes('gunduz') || itemTags.includes('office'))) score += 0.07;
  if (hasAnyToken(queryTokens, INTENT_TOKEN_GROUPS.night) && (itemOccasion.includes('gece') || itemOccasion.includes('aksam') || itemTags.includes('night'))) score += 0.07;
  if (hasAnyToken(queryTokens, INTENT_TOKEN_GROUPS.summer) && itemSeason.some((s) => s.includes('yaz') || s.includes('ilkbahar'))) score += 0.05;
  if (hasAnyToken(queryTokens, INTENT_TOKEN_GROUPS.winter) && itemSeason.some((s) => s.includes('kis') || s.includes('sonbahar'))) score += 0.05;
  if (hasAnyToken(queryTokens, INTENT_TOKEN_GROUPS.budget) && ['budget', 'mainstream'].includes(priceBand)) score += 0.06;
  if (hasAnyToken(queryTokens, INTENT_TOKEN_GROUPS.premium) && ['premium', 'luxury'].includes(priceBand)) score += 0.06;
  if (hasAnyToken(queryTokens, INTENT_TOKEN_GROUPS.profile) && itemTags.some((tag) => tag.includes('profile') || tag.includes('benzer') || tag.includes('signature'))) score += 0.04;
  if (hasAnyToken(queryTokens, INTENT_TOKEN_GROUPS.trMarket) && itemTags.includes('tr market')) score += 0.06;

  return Math.max(0, Math.min(0.32, Number(score.toFixed(4))));
}

function extractLatestUserQuery(messages) {
  const rows = Array.isArray(messages) ? messages : [];
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const msg = rows[i];
    if (msg?.role !== 'user') continue;
    if (typeof msg.content === 'string') return cleanString(msg.content);
    if (!Array.isArray(msg.content)) continue;
    const text = msg.content
      .filter((block) => block?.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join(' ')
      .trim();
    if (text) return text;
  }
  return '';
}

function localCatalogSearch(query, topK = DEFAULT_TOP_K) {
  const queryTokens = uniqueTokens(tokenize(query));
  if (!queryTokens.length) return [];

  const queryNorm = normalizeText(query);
  const items = [];
  PERFUME_CATALOG.forEach((item) => {
    const blob = [
      item.canonicalName,
      ...(Array.isArray(item.aliases) ? item.aliases : []),
      item.family,
      item.occasion,
      ...(Array.isArray(item.season) ? item.season : []),
      ...(Array.isArray(item.tags) ? item.tags : []),
      item.priceBand,
      ...(Array.isArray(item.pyramid?.top) ? item.pyramid.top : []),
      ...(Array.isArray(item.pyramid?.middle) ? item.pyramid.middle : []),
      ...(Array.isArray(item.pyramid?.base) ? item.pyramid.base : []),
      ...(Array.isArray(item.representativeMolecules) ? item.representativeMolecules.map((m) => m?.name) : []),
    ].join(' ');
    const hayTokens = uniqueTokens(tokenize(blob));
    if (!hayTokens.length) return;

    let overlap = 0;
    queryTokens.forEach((token) => {
      if (hayTokens.includes(token)) overlap += 1;
    });
    if (!overlap) return;

    const aliasHit = (item.aliases || []).some((alias) => normalizeText(alias).includes(queryNorm));
    const canonicalHit = normalizeText(item.canonicalName).includes(queryNorm);
    const exactHit = normalizeText(item.canonicalName) === queryNorm
      || (item.aliases || []).some((alias) => normalizeText(alias) === queryNorm);
    const intentBoost = scoreIntentFit(queryTokens, item);
    const score = (overlap / queryTokens.length) * 0.62
      + (aliasHit ? 0.13 : 0)
      + (canonicalHit ? 0.09 : 0)
      + (exactHit ? 0.10 : 0)
      + intentBoost;

    items.push({
      id: normalizeText(item.canonicalName) || item.canonicalName,
      title: item.canonicalName,
      score: Number(score.toFixed(4)),
      snippet: `${item.family || 'Koku ailesi bilinmiyor'} | ${item.occasion || 'Kullanim senaryosu bilinmiyor'} | ${(item.season || []).join(', ') || 'Mevsim bilgisi yok'} | ${(item.tags || []).slice(0, 3).join(', ') || 'Genel profil'} | ${item.priceBand || 'mid'}`,
      source: 'catalog',
      url: item.sources?.[0]?.url || '',
      metadata: {
        family: item.family || '',
        occasion: item.occasion || '',
        season: Array.isArray(item.season) ? item.season.slice(0, 4) : [],
        tags: Array.isArray(item.tags) ? item.tags.slice(0, 6) : [],
        priceBand: cleanString(item.priceBand) || '',
      },
    });
  });

  return items
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

async function embedQueryWithGemini(query) {
  const apiKey = cleanString(process.env.GEMINI_API_KEY) || cleanString(process.env.LLM_API_KEY);
  if (!apiKey) return null;
  const outputDimensionality = Math.max(
    1,
    Number.parseInt(cleanString(process.env.RAG_EMBEDDING_DIM) || '768', 10) || 768,
  );

  const model = cleanString(process.env.RAG_EMBEDDING_MODEL) || 'gemini-embedding-001';
  const candidates = Array.from(
    new Set([model, 'gemini-embedding-001', 'gemini-embedding-2-preview'].map((item) => cleanString(item)).filter(Boolean)),
  );

  let lastError = null;
  for (const candidate of candidates) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidate)}:embedContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          content: {
            parts: [{ text: query.slice(0, 3000) }],
          },
          outputDimensionality,
        }),
      },
    );

    if (!response.ok) {
      const payload = await response.text().catch(() => '');
      lastError = new Error(payload || `gemini embedding failed (${response.status})`);
      if (response.status === 404 || response.status === 400) continue;
      throw lastError;
    }

    const data = await response.json();
    const rawVector = Array.isArray(data?.embedding?.values) ? data.embedding.values : null;
    const vector = normalizeEmbeddingVector(rawVector, outputDimensionality);
    if (vector && vector.length) return vector;
  }

  if (lastError) throw lastError;
  return null;
}

async function queryPinecone(vector, topK = DEFAULT_TOP_K) {
  const host = toUrlBase(process.env.PINECONE_INDEX_HOST);
  const apiKey = cleanString(process.env.PINECONE_API_KEY);
  if (!host || !apiKey || !Array.isArray(vector) || vector.length === 0) return [];

  const response = await fetch(`${host}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': apiKey,
      'X-Pinecone-API-Version': cleanString(process.env.PINECONE_API_VERSION) || '2024-07',
    },
    body: JSON.stringify({
      vector,
      topK,
      includeMetadata: true,
    }),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => '');
    throw new Error(payload || `pinecone query failed (${response.status})`);
  }

  const data = await response.json();
  const matches = Array.isArray(data?.matches) ? data.matches : [];
  return matches.map((match) => ({
    id: cleanString(match?.id),
    title: cleanString(match?.metadata?.title || match?.metadata?.name || match?.id || ''),
    score: Number(match?.score || 0),
    snippet: cleanString(match?.metadata?.snippet || match?.metadata?.content || '').slice(0, 220),
    source: 'pinecone',
    url: cleanString(match?.metadata?.url || ''),
    metadata: {
      family: cleanString(match?.metadata?.family || ''),
      occasion: cleanString(match?.metadata?.occasion || ''),
    },
  })).filter((item) => item.title);
}

async function querySupabaseVector(vector, topK = DEFAULT_TOP_K) {
  const url = toUrlBase(process.env.SUPABASE_URL);
  const key = cleanString(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const rpc = cleanString(process.env.SUPABASE_VECTOR_RPC) || 'match_perfume_docs';
  if (!url || !key || !Array.isArray(vector) || vector.length === 0) return [];

  const response = await fetch(`${url}/rest/v1/rpc/${encodeURIComponent(rpc)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      query_embedding: vector,
      match_count: topK,
    }),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => '');
    throw new Error(payload || `supabase vector rpc failed (${response.status})`);
  }

  const rows = await response.json();
  return (Array.isArray(rows) ? rows : []).map((row, index) => ({
    id: cleanString(row?.id || `supabase-${index}`),
    title: cleanString(row?.title || row?.name || ''),
    score: Number(row?.score || row?.similarity || 0),
    snippet: cleanString(row?.snippet || row?.content || '').slice(0, 220),
    source: `supabase-vector:${cleanString(row?.doc_type || 'perfume') || 'perfume'}`,
    url: cleanString(row?.url || ''),
    metadata: {
      family: cleanString(row?.family || ''),
      occasion: cleanString(row?.occasion || ''),
      tags: cleanString(row?.doc_type) ? [cleanString(row.doc_type)] : [],
    },
  })).filter((item) => item.title);
}

function mergeResults(...groups) {
  const seen = new Set();
  const merged = [];
  groups.flat().forEach((item) => {
    const key = cleanString(item?.id || item?.title).toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });
  return merged.sort((a, b) => Number(b?.score || 0) - Number(a?.score || 0));
}

function buildPromptBlock(query, results) {
  const lines = [];
  lines.push('RAG_BAGLAMI: Asagidaki urun havuzunu onceliklendir. Cevapta bu havuz disina cikacaksan acikca belirt.');
  lines.push(`KULLANICI_SORUSU: ${cleanString(query).slice(0, 260)}`);
  lines.push('ADAYLAR:');
  results.slice(0, MAX_CONTEXT_ITEMS).forEach((item, index) => {
    const parts = [
      `${index + 1}. ${cleanString(item.title)}`,
      cleanString(item?.metadata?.family) ? `aile=${cleanString(item.metadata.family)}` : '',
      cleanString(item?.metadata?.occasion) ? `kullanim=${cleanString(item.metadata.occasion)}` : '',
      Array.isArray(item?.metadata?.season) && item.metadata.season.length ? `mevsim=${item.metadata.season.join(',')}` : '',
      cleanString(item?.metadata?.priceBand) ? `fiyat_bandi=${cleanString(item.metadata.priceBand)}` : '',
      Array.isArray(item?.metadata?.tags) && item.metadata.tags.length ? `etiket=${item.metadata.tags.join(',')}` : '',
      cleanString(item.snippet) ? `ozet=${cleanString(item.snippet)}` : '',
      cleanString(item.url) ? `url=${cleanString(item.url)}` : '',
      `kaynak=${cleanString(item.source)}`,
      `skor=${Number(item.score || 0).toFixed(3)}`,
    ].filter(Boolean);
    lines.push(parts.join(' | '));
  });
  const block = lines.join('\n');
  return block.slice(0, MAX_CONTEXT_CHARS);
}

async function buildAdvisorRagContext(options = {}) {
  const messages = Array.isArray(options.messages) ? options.messages : [];
  const topK = Number.isFinite(Number(options.topK)) ? Math.max(1, Number(options.topK)) : DEFAULT_TOP_K;
  const query = extractLatestUserQuery(messages);
  if (!query) {
    return {
      promptBlock: '',
      meta: { enabled: false, reason: 'no_user_query', sources: [] },
    };
  }

  const localHits = localCatalogSearch(query, topK);
  let vectorHits = [];
  let vectorProvider = '';
  let vectorError = '';

  try {
    const vectorEnabled = /^(1|true|yes|on)$/i.test(cleanString(process.env.RAG_ENABLE_VECTOR));
    if (vectorEnabled) {
      const vector = await embedQueryWithGemini(query);
      if (vector && vector.length) {
        if (cleanString(process.env.PINECONE_INDEX_HOST) && cleanString(process.env.PINECONE_API_KEY)) {
          vectorHits = await queryPinecone(vector, topK);
          vectorProvider = 'pinecone';
        } else if (cleanString(process.env.SUPABASE_URL) && cleanString(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
          vectorHits = await querySupabaseVector(vector, topK);
          vectorProvider = 'supabase-vector';
        }
      }
    }
  } catch (error) {
    vectorError = cleanString(error?.message).slice(0, 220);
  }

  const merged = mergeResults(vectorHits, localHits).slice(0, MAX_CONTEXT_ITEMS);
  if (!merged.length) {
    return {
      promptBlock: '',
      meta: {
        enabled: false,
        reason: 'no_match',
        sources: [],
        vectorProvider: vectorProvider || '',
        vectorError,
      },
    };
  }

  return {
    promptBlock: buildPromptBlock(query, merged),
    meta: {
      enabled: true,
      query: cleanString(query).slice(0, 180),
      hitCount: merged.length,
      sources: merged.map((item) => ({
        title: cleanString(item.title).slice(0, 120),
        source: cleanString(item.source).slice(0, 40),
        url: cleanString(item.url).slice(0, 220),
        score: Number(item.score || 0),
      })),
      vectorProvider: vectorProvider || '',
      vectorError,
    },
  };
}

module.exports = {
  buildAdvisorRagContext,
};
