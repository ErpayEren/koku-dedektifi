const { createClient } = require('@supabase/supabase-js');
const { cleanString, resolveSupabaseConfig } = require('./supabase-config');
const noteMoleculeMap = require('../nota_molecules.json');

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNoteKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeDirectIdentityQuery(value) {
  const normalized = normalizeSearchText(value);
  if (!normalized) return false;
  if (/[;,|/]/.test(String(value || ''))) return false;
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 5) return false;
  const longTokenCount = tokens.filter((token) => token.length >= 4).length;
  if (longTokenCount === 0) return false;
  const descriptiveHints = [
    'gibi',
    'ama',
    'kadar',
    'kokan',
    'kokusu',
    'odunsu',
    'fresh',
    'tatli',
    'ÅŸekerli',
    'hafif',
    'agir',
    'benziyor',
    'benzeyen',
  ];
  if (descriptiveHints.some((hint) => normalized.includes(normalizeSearchText(hint)))) return false;
  return true;
}

function parseNotes(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanString(item)).filter(Boolean);
  }
  const text = cleanString(value);
  if (!text) return [];
  return text
    .split(/[;,|/]/)
    .map((item) => cleanString(item))
    .filter(Boolean);
}

function deriveFamilyFromAccords(accords) {
  const text = (Array.isArray(accords) ? accords : [])
    .map((item) => normalizeSearchText(item))
    .join(' ');

  if (!text) return '';
  if (/(gourmand|sweet|caramel|vanilla|praline)/.test(text)) return 'Gourmand';
  if (/(oud|agarwood)/.test(text)) return 'Oud';
  if (/(oriental|amber|resin|incense|spicy)/.test(text)) return 'Oryantal';
  if (/(woody|wood|cedar|sandal|patchouli|vetiver)/.test(text)) return 'Odunsu';
  if (/(aromatic|fougere|green|herbal)/.test(text)) return 'Aromatik';
  if (/(floral|rose|jasmine|iris|white floral)/.test(text)) return 'Ciceksi';
  if (/(citrus|aquatic|marine|fresh)/.test(text)) return 'Aquatik';
  return '';
}

function parseBoolean(value, fallback = false) {
  const normalized = cleanString(String(value ?? '')).toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function withTimeout(promise, timeoutMs, timeoutMessage = 'timeout') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleanString(value));
}

function normalizeEmbeddingVector(values, expectedDim) {
  if (!Array.isArray(values) || values.length === 0) return null;
  if (values.length === expectedDim) return values;
  if (values.length > expectedDim) return values.slice(0, expectedDim);
  return null;
}

function extractMappedMoleculeNames(hit) {
  if (!hit || typeof hit !== 'object') return [];
  if (Array.isArray(hit.key_molecules) && hit.key_molecules.length > 0) {
    return hit.key_molecules
      .map((item) => cleanString(item?.name))
      .filter(Boolean);
  }
  if (Array.isArray(hit.molecules)) {
    return hit.molecules.map((item) => cleanString(item)).filter(Boolean);
  }
  return [];
}

async function embedTextWithGemini(text) {
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
          content: { parts: [{ text: cleanString(text).slice(0, 3000) }] },
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

    const data = await response.json().catch(() => ({}));
    const rawVector = Array.isArray(data?.embedding?.values) ? data.embedding.values : null;
    const vector = normalizeEmbeddingVector(rawVector, outputDimensionality);
    if (vector && vector.length) return vector;
  }

  if (lastError) throw lastError;
  return null;
}

function getSupabaseAdminClient() {
  const config = resolveSupabaseConfig();
  if (!cleanString(config.url) || !cleanString(config.serviceRoleKey)) return null;
  return createClient(config.url, config.serviceRoleKey, { auth: { persistSession: false } });
}

function compactMapForPrompt(map, focusNotes = []) {
  const normalizedFocus = (Array.isArray(focusNotes) ? focusNotes : [])
    .map((item) => normalizeNoteKey(item))
    .filter(Boolean);
  const focusSet = new Set(normalizedFocus);

  const baselineNotes = [
    'bergamot',
    'ambroxan',
    'vetiver',
    'oud',
    'patchouli',
    'sandalwood',
    'jasmine',
    'rose',
    'vanilla',
    'musk',
    'cedar',
    'iris',
    'lavender',
    'neroli',
    'ylang ylang',
    'cardamom',
    'pepper',
    'frankincense',
    'oakmoss',
    'labdanum',
    'iso e super',
    'hedione',
    'galaxolide',
    'cashmeran',
    'ambergris',
    'amber',
  ]
    .map((item) => normalizeNoteKey(item))
    .filter(Boolean);

  baselineNotes.forEach((note) => focusSet.add(note));

  const allEntries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  const lines = [];
  for (const [note, data] of allEntries) {
    if (!focusSet.has(note) && lines.length >= 42) break;
    if (!focusSet.has(note) && lines.length >= 24) continue;
    const family = cleanString(data?.family || data?.accord_family) || 'Unknown';
    const molecules = extractMappedMoleculeNames(data).slice(0, 4).join(', ');
    if (!molecules) continue;
    lines.push(`${note} -> ${family} -> ${molecules}`);
  }

  return lines.join('\n');
}

function buildMolecularHintsFromNotes(noteList) {
  const normalized = noteList.map((note) => ({ raw: note, key: normalizeNoteKey(note) }));
  const lines = [];
  for (const item of normalized) {
    const hit = noteMoleculeMap[item.key];
    if (!hit) continue;
    const family = cleanString(hit.family || hit.accord_family) || 'Unknown';
    const molecules = extractMappedMoleculeNames(hit).slice(0, 4);
    if (molecules.length === 0) continue;
    lines.push(`${item.raw} -> ${family} -> ${molecules.join(', ')}`);
  }
  return lines;
}

function scoreCandidate(row, inputText) {
  const query = normalizeSearchText(inputText);
  const name = normalizeSearchText(row?.name);
  const brand = normalizeSearchText(row?.brand);
  const full = normalizeSearchText(`${row?.brand || ''} ${row?.name || ''}`);
  const notes = [
    ...parseNotes(row?.top_notes),
    ...parseNotes(row?.heart_notes),
    ...parseNotes(row?.base_notes),
    ...parseNotes(row?.accords),
    ...parseNotes(row?.character_tags),
  ]
    .map((item) => normalizeSearchText(item))
    .filter(Boolean);

  if (!query) return 0;

  let score = 0;
  if (full === query) score += 180;
  if (name === query) score += 160;
  if (name.startsWith(query)) score += 110;
  if (name.includes(query)) score += 92;
  if (query.includes(name) && name.length >= 4) score += 74;
  if (brand && brand === query) score += 58;
  if (brand && query.includes(brand)) score += 26;
  if (notes.some((item) => item.includes(query) || query.includes(item))) score += 18;
  return score;
}

function uniqueValues(values) {
  const out = [];
  const seen = new Set();
  values.forEach((item) => {
    const cleaned = cleanString(item);
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(cleaned);
  });
  return out;
}

function resolveTableCandidates() {
  return uniqueValues([
    cleanString(process.env.SUPABASE_FRAGRANCES_TABLE),
    cleanString(process.env.SUPABASE_PERFUMES_TABLE),
    'fragrances',
    'perfumes',
  ]);
}

function resolveAccordsFromRow(row) {
  return parseNotes(row?.character_tags || row?.accords);
}

async function queryContextRows({ client, table, selectColumns, orFilter }) {
  const { data, error } = await client
    .from(table)
    .select(selectColumns)
    .or(orFilter)
    .limit(72);
  if (error) return { rows: [], error };
  return { rows: Array.isArray(data) ? data : [], error: null };
}

function addUniqueCandidate(store, row, reason) {
  const name = cleanString(row?.name);
  if (!name) return;
  const brand = cleanString(row?.brand);
  const key = `${brand.toLowerCase()}::${name.toLowerCase()}`;
  if (store.some((item) => item.key === key)) return;

  store.push({
    key,
    name,
    brand,
    priceTier: cleanString(row?.price_tier) || null,
    reason: cleanString(reason) || 'Benzer akor omurgasi.',
  });
}

function extractVectorScore(row) {
  const scoreCandidates = [row?.score, row?.similarity, row?.match_score, row?.distance];
  for (const scoreValue of scoreCandidates) {
    const numeric = Number(scoreValue);
    if (Number.isFinite(numeric)) return numeric;
  }
  return 0;
}

async function findRowsByVectorSearch({ client, table, selectColumns, inputText }) {
  const vectorEnabled = parseBoolean(process.env.RAG_ENABLE_VECTOR, false);
  if (!vectorEnabled) {
    return { rows: [], scoreById: new Map() };
  }

  const rpc = cleanString(process.env.SUPABASE_VECTOR_RPC) || 'match_perfume_docs';
  const matchCount = Math.max(8, Number.parseInt(process.env.RAG_VECTOR_MATCH_COUNT || '24', 10) || 24);

  const result = await withTimeout(
    (async () => {
      const embedding = await embedTextWithGemini(inputText);
      if (!embedding || embedding.length === 0) {
        return { rows: [], scoreById: new Map() };
      }

      const { data: rawMatches, error: matchError } = await client.rpc(rpc, {
        query_embedding: embedding,
        match_count: matchCount,
      });
      if (matchError || !Array.isArray(rawMatches) || rawMatches.length === 0) {
        return { rows: [], scoreById: new Map() };
      }

      const scoreById = new Map();
      const ids = [];
      rawMatches.forEach((row) => {
        const idCandidates = [row?.perfume_id, row?.fragrance_id, row?.id];
        const vectorScore = extractVectorScore(row);
        idCandidates.forEach((candidateId) => {
          const cleaned = cleanString(candidateId);
          if (!isUuid(cleaned)) return;
          if (!ids.includes(cleaned)) ids.push(cleaned);
          const existing = scoreById.get(cleaned);
          if (!Number.isFinite(existing) || vectorScore > existing) {
            scoreById.set(cleaned, vectorScore);
          }
        });
      });

      if (ids.length === 0) {
        return { rows: [], scoreById: new Map() };
      }

      const { data: rows, error } = await client
        .from(table)
        .select(selectColumns)
        .in('id', ids.slice(0, matchCount))
        .limit(matchCount);

      if (error || !Array.isArray(rows) || rows.length === 0) {
        return { rows: [], scoreById: new Map() };
      }

      return { rows, scoreById };
    })(),
    3000,
    'vector_search_timeout',
  ).catch(() => ({ rows: [], scoreById: new Map() }));

  return result;
}

async function findPerfumeContextByInput(inputText, options = {}) {
  const text = cleanString(inputText);
  if (!text) return null;
  if (options?.mode === 'notes') return null;

  const client = getSupabaseAdminClient();
  if (!client) return null;

  try {
    const allowVector = options?.allowVector !== false && !looksLikeDirectIdentityQuery(text);
    const includeSimilarCandidates = options?.includeSimilarCandidates === true;
    const escaped = text.replace(/[%_]/g, ' ');
    const normalizedSearch = normalizeSearchText(escaped);
    const phrasePattern = normalizedSearch.split(/\s+/).filter(Boolean).join('%');
    const tokenFilters = normalizedSearch
      .split(/\s+/)
      .map((item) => cleanString(item))
      .filter((item) => item.length >= 2)
      .slice(0, 5);
    const orFilters = [];
    if (phrasePattern) {
      orFilters.push(`name.ilike.%${phrasePattern}%`);
      orFilters.push(`brand.ilike.%${phrasePattern}%`);
    }
    tokenFilters.forEach((token) => {
      orFilters.push(`name.ilike.%${token}%`);
      orFilters.push(`brand.ilike.%${token}%`);
    });
    if (orFilters.length === 0) return null;
    const queryFilter = orFilters.join(',');
    const queryConfigs = [
      {
        selectColumns: 'id, name, brand, year, top_notes, heart_notes, base_notes, character_tags, rating, price_tier',
      },
      {
        selectColumns: 'id, name, brand, year, top_notes, heart_notes, base_notes, accords, rating, price_tier',
      },
    ];

    const tableCandidates = resolveTableCandidates();
    let activeTable = '';
    let activeSelectColumns = '';
    let baseRows = [];

    for (const tableCandidate of tableCandidates) {
      for (const config of queryConfigs) {
        const { rows, error } = await queryContextRows({
          client,
          table: tableCandidate,
          selectColumns: config.selectColumns,
          orFilter: queryFilter,
        });

        if (error) {
          continue;
        }

        if (!activeTable) {
          activeTable = tableCandidate;
          activeSelectColumns = config.selectColumns;
        }

        if (rows.length > 0) {
          activeTable = tableCandidate;
          activeSelectColumns = config.selectColumns;
          baseRows = rows;
          break;
        }
      }
      if (baseRows.length > 0) break;
    }

    if (!activeTable || !activeSelectColumns) return null;

    const vectorPayload =
      allowVector && text.length >= 6
        ? await findRowsByVectorSearch({
            client,
            table: activeTable,
            selectColumns: activeSelectColumns,
            inputText: text,
          })
        : { rows: [], scoreById: new Map() };

    const mergedMap = new Map();
    const vectorScoreById = vectorPayload.scoreById instanceof Map ? vectorPayload.scoreById : new Map();
    [...baseRows, ...(Array.isArray(vectorPayload.rows) ? vectorPayload.rows : [])].forEach((row) => {
      const name = cleanString(row?.name);
      if (!name) return;
      const brand = cleanString(row?.brand);
      const id = cleanString(row?.id);
      const key = id && isUuid(id) ? id : `${brand.toLowerCase()}::${name.toLowerCase()}`;
      if (!mergedMap.has(key)) {
        mergedMap.set(key, row);
      }
    });

    const mergedRows = Array.from(mergedMap.values());
    if (mergedRows.length === 0) return null;

    const scored = mergedRows
      .slice()
      .map((row) => {
        const id = cleanString(row?.id);
        const vectorScore = Number(vectorScoreById.get(id) || 0);
        const score = scoreCandidate(row, text) + vectorScore * 120;
        return {
          row,
          score,
          vectorScore,
        };
      })
      .sort((left, right) => {
        return right.score - left.score;
      });
      const bestEntry = scored[0];
      if (!bestEntry) return null;

      const directIdentityQuery = looksLikeDirectIdentityQuery(text);
      const minimumAcceptScore =
        options?.mode === 'image'
          ? 44
          : directIdentityQuery
            ? 34
            : 60;
      if (bestEntry.score < minimumAcceptScore && bestEntry.vectorScore < 0.2) {
        return null;
      }

    const data = bestEntry.row;

    const top = parseNotes(data.top_notes);
    const heart = parseNotes(data.heart_notes);
    const base = parseNotes(data.base_notes);
    const accords = resolveAccordsFromRow(data);
    const allNotes = [...top, ...heart, ...base];
    const mapped = buildMolecularHintsFromNotes(allNotes);
    const similar = [];
    const evidenceMolecules = [];

    if (includeSimilarCandidates) {
      // Keep a candidate pool only when the caller explicitly needs it.
      scored.slice(1, 28).forEach((item) => {
        addUniqueCandidate(similar, item.row, 'Arama sinyalinde yakin profil adayi.');
      });

      if (cleanString(data.brand)) {
        const { data: byBrand } = await client
          .from(activeTable)
          .select('id, name, brand, price_tier')
          .eq('brand', data.brand)
          .limit(20);

        if (Array.isArray(byBrand)) {
          byBrand.forEach((row) => {
            if (cleanString(row?.name).toLowerCase() === cleanString(data.name).toLowerCase()) return;
            addUniqueCandidate(similar, row, `${cleanString(data.brand)} markasinda yakin profil.`);
          });
        }
      }

      const anchorNotes = [top[0], heart[0], base[0], accords[0]].map((item) => cleanString(item)).filter(Boolean);
      for (const note of anchorNotes.slice(0, 2)) {
        const noteColumns = ['top_notes', 'heart_notes', 'base_notes', 'character_tags', 'accords'];
        for (const column of noteColumns) {
          const { data: noteMatches, error: noteError } = await client
            .from(activeTable)
            .select('id, name, brand, price_tier')
            .contains(column, [note])
            .limit(8);

          if (noteError || !Array.isArray(noteMatches)) continue;
          noteMatches.forEach((row) => {
            if (cleanString(row?.name).toLowerCase() === cleanString(data.name).toLowerCase()) return;
            addUniqueCandidate(similar, row, `"${note}" notasini paylasan benzer akor.`);
          });
          if (similar.length >= 12) break;
        }
        if (similar.length >= 12) break;
      }
    }

    const evidenceTable = cleanString(process.env.SUPABASE_EVIDENCE_TABLE) || 'fragrance_molecule_evidence';
    if (cleanString(data.id)) {
      const { data: evidenceRows } = await client
        .from(evidenceTable)
        .select('molecule_name, evidence_level, evidence_reason, matched_notes, evidence_rank')
        .eq('fragrance_id', data.id)
        .order('evidence_rank', { ascending: false })
        .limit(16);

      if (Array.isArray(evidenceRows)) {
        evidenceRows.forEach((row) => {
          const name = cleanString(row?.molecule_name);
          if (!name) return;
          if (evidenceMolecules.some((item) => item.name.toLowerCase() === name.toLowerCase())) return;
          evidenceMolecules.push({
            name,
            evidenceLevel: cleanString(row?.evidence_level) || 'note_match',
            evidenceReason: cleanString(row?.evidence_reason) || '',
            matchedNotes: parseNotes(row?.matched_notes),
          });
        });
      }
    }

    return {
      name: cleanString(data.name),
      brand: cleanString(data.brand),
      year: Number.isFinite(Number(data.year)) ? Number(data.year) : null,
      family: deriveFamilyFromAccords(accords),
      rating: Number.isFinite(Number(data.rating)) ? Number(data.rating) : null,
      priceTier: cleanString(data.price_tier) || null,
      concentration: cleanString(data.concentration) || null,
      genderProfile: cleanString(data.gender_profile) || null,
      seasons: parseNotes(data.seasons),
      occasions: parseNotes(data.occasions),
      longevityScore: Number.isFinite(Number(data.longevity_score)) ? Number(data.longevity_score) : null,
      sillageScore: Number.isFinite(Number(data.sillage_score)) ? Number(data.sillage_score) : null,
      top,
      heart,
      base,
      accords,
      mapped,
      similar,
      evidenceMolecules,
    };
  } catch (error) {
    console.error('[perfume-context] context lookup failed:', cleanString(error?.message) || 'unknown_error');
    return null;
  }
}

function buildPerfumeAnalysisSystemPrompt({ isPro, perfumeContext }) {
  const focusNotes = perfumeContext
    ? [
        ...(Array.isArray(perfumeContext.top) ? perfumeContext.top : []),
        ...(Array.isArray(perfumeContext.heart) ? perfumeContext.heart : []),
        ...(Array.isArray(perfumeContext.base) ? perfumeContext.base : []),
        ...(Array.isArray(perfumeContext.accords) ? perfumeContext.accords : []),
      ]
    : [];
  const mapBlock = compactMapForPrompt(noteMoleculeMap, focusNotes);
  const contextBlock = perfumeContext
    ? [
        `PARFUM DB KAYDI: ${perfumeContext.brand ? `${perfumeContext.brand} ` : ''}${perfumeContext.name}`,
        perfumeContext.year ? `YIL: ${perfumeContext.year}` : null,
        perfumeContext.rating ? `RATING: ${perfumeContext.rating}` : null,
        perfumeContext.priceTier ? `PRICE_TIER: ${perfumeContext.priceTier}` : null,
        `TOP: ${perfumeContext.top.join(', ') || '-'}`,
        `HEART: ${perfumeContext.heart.join(', ') || '-'}`,
        `BASE: ${perfumeContext.base.join(', ') || '-'}`,
        `ACCORDS: ${perfumeContext.accords.join(', ') || '-'}`,
        perfumeContext.mapped.length > 0 ? `NOTA->AKOR->MOLEKUL:\n${perfumeContext.mapped.join('\n')}` : null,
        perfumeContext.evidenceMolecules?.length > 0
          ? `KANITLI MOLEKULLER:\n${perfumeContext.evidenceMolecules
              .slice(0, 10)
              .map((item) => `- ${item.name} [${item.evidenceLevel}] ${item.evidenceReason || ''}`.trim())
              .join('\n')}`
          : null,
        perfumeContext.similar?.length > 0
          ? `DB BENZER ADAYLAR:\n${perfumeContext.similar
              .slice(0, 8)
              .map((item) => `- ${item.brand ? `${item.brand} ` : ''}${item.name} (${item.reason})`)
              .join('\n')}`
          : null,
      ]
        .filter(Boolean)
        .join('\n')
    : 'PARFUM DB KAYDI: Eslesen parfum kaydi bulunamadi.';

  const freeRules = [
    '- keyMolecules: ilk molekul tam, digerleri percentage = "Pro ile goruntule".',
    '- similarFragrances: en az 3, en fazla 3. Bos birakma.',
    '- expertComment: en fazla 2 cumle + "... [Pro ile devamini oku]".',
    '- layeringTip ve applicationTip: "Pro ile goruntule".',
  ].join('\n');

  const proRules = [
    '- keyMolecules: tum ilgili molekulleri tam ver.',
    '- similarFragrances: en az 6, en fazla 10 ver. Bos birakma.',
    '- expertComment: 4-5 cumle derin analiz ver.',
    '- layeringTip ve applicationTip dolu olsun.',
  ].join('\n');

  const scoringRubric = [
    'SKOR KURALLARI (1-10, tam sayi):',
    '',
    'valueScore â€” Fiyat/performans dengesi:',
    '- 1-3: Cok pahali, alternatifler cok daha ucuz',
    '- 4-6: Fiyatina deger ama rakipler var',
    '- 7-8: Fiyatina gore ustun performans',
    '- 9-10: Kategorisinde en iyi deger',
    '',
    'uniquenessScore â€” Karakterin ayirt ediciligi:',
    '- 1-3: Cok bilinen, jenerik profil',
    '- 4-6: Tanidik ama kendi yorumu var',
    '- 7-8: Belirgin kimlik, kalabalikta fark edilir',
    '- 9-10: Tamamen ozgun, kopyasi yok',
    '',
    'wearabilityScore â€” Gunluk kullanim esnekligi:',
    '- 1-3: Cok spesifik (sadece gece / kis)',
    '- 4-6: Belirli durumlar icin ideal',
    '- 7-8: Cogu durumda giyilebilir',
    '- 9-10: Her mevsim, her ortam',
    '',
    'SKORLAMA BAGLAMI:',
    '- perfumeContext varsa rating ve PRICE_TIER bilgisini skor hesaplamasina dahil et.',
    '- rating yuksek + fiyat seviyesi dengeliyse valueScore artir.',
    '- fiyat cok yuksek ve profil jenerikse valueScore ile uniquenessScore dusur.',
    '- Skorlar ortalamaya sabitlenmesin; girdiye gore farkli degerler ver.',
  ].join('\n');

  const confidenceRule =
    'confidenceScore KURALLARI (0-100 tam sayi):\n' +
    '- Parfumu net tanimlayabiliyorsan (marka + isim gorunuyor veya net karakterize edilebildi): 60-95 araliginda ver.\n' +
    '- Gercekten emin degilsen (bulanik gorsel, birden fazla olasilik): 20-40 kullan.\n' +
    '- Muhafazakar olma; neti gorduğünde yüksek ver.';

  const notesRule =
    'NOTA PIRAMIDI KURALLARI:\n' +
    '- topNotes, heartNotes, baseNotes her birinde EN AZ 3 nota listele.\n' +
    '- Tanimlayabildigin tum notalari ekle; standart parfumeri terminolojisi kullan.\n' +
    '- Turkce karsiliklari kabul edilebilir (ornek: bergamot, lavanta, sedir, misk).';

  return [
    'Sen bir parfum kimyagerisin.',
    'Gorevin kokularin tam formulu degil, molekuler yapisini aciklamaktir.',
    'Asla "bu parfumun tam formulu" iddiasi kurma.',
    'Dili: Turkce.',
    '',
    'YONTEM:',
    '1) Nota -> Akor Ailesi -> Temsil Eden Molekuller',
    '2) Molekul rolunu (ust/kalp/dip) karakter diliyle anlat',
    '3) Emin olmadigin yerde tahmin uydurma, null birak',
    '',
    contextBlock,
    '',
    scoringRubric,
    '',
    confidenceRule,
    '',
    notesRule,
    '',
    'NOTA-MOLEKUL REFERANSI:',
    mapBlock,
    '',
    isPro ? 'PRO CIKTI KURALLARI:\n' + proRules : 'FREE CIKTI KURALLARI:\n' + freeRules,
    '',
    'SADECE JSON DON.'
  ].join('\n');
}

module.exports = {
  buildPerfumeAnalysisSystemPrompt,
  findPerfumeContextByInput,
};

