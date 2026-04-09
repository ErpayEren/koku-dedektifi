const { createClient } = require('@supabase/supabase-js');
const { cleanString } = require('./supabase-config');
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
    const vector = Array.isArray(data?.embedding?.values) ? data.embedding.values : null;
    if (vector && vector.length) return vector;
  }

  if (lastError) throw lastError;
  return null;
}

function getSupabaseAdminClient() {
  const url = cleanString(process.env.SUPABASE_URL) || cleanString(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key =
    cleanString(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    cleanString(process.env.SUPABASE_SERVICE_KEY) ||
    cleanString(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
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
    if (!focusSet.has(note) && lines.length >= 120) break;
    if (!focusSet.has(note) && lines.length >= 80) continue;
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

  const client = getSupabaseAdminClient();
  if (!client) return null;

  const table =
    cleanString(process.env.SUPABASE_FRAGRANCES_TABLE) ||
    cleanString(process.env.SUPABASE_PERFUMES_TABLE) ||
    'fragrances';

  try {
    const allowVector = options?.allowVector !== false;
    const escaped = text.replace(/[%_]/g, ' ');
    const tokenFilters = escaped
      .split(/\s+/)
      .map((item) => cleanString(item))
      .filter((item) => item.length >= 2)
      .slice(0, 5);
    const orFilters = [`name.ilike.%${escaped}%`, `brand.ilike.%${escaped}%`];
    tokenFilters.forEach((token) => {
      orFilters.push(`name.ilike.%${token}%`);
      orFilters.push(`brand.ilike.%${token}%`);
    });

    const selectColumns = 'id, name, brand, year, top_notes, heart_notes, base_notes, accords, rating, price_tier';
    const { data: rows, error } = await client
      .from(table)
      .select(selectColumns)
      .or(orFilters.join(','))
      .limit(72);

    const baseRows = error || !Array.isArray(rows) ? [] : rows;
    const vectorPayload =
      allowVector && text.length >= 6
        ? await findRowsByVectorSearch({
            client,
            table,
            selectColumns,
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

    const sorted = mergedRows
      .slice()
      .sort((left, right) => {
        const rightId = cleanString(right?.id);
        const leftId = cleanString(left?.id);
        const rightVector = Number(vectorScoreById.get(rightId) || 0);
        const leftVector = Number(vectorScoreById.get(leftId) || 0);
        const rightScore = scoreCandidate(right, text) + rightVector * 120;
        const leftScore = scoreCandidate(left, text) + leftVector * 120;
        return rightScore - leftScore;
      });
    const data = sorted[0];
    if (!data) return null;

    const top = parseNotes(data.top_notes);
    const heart = parseNotes(data.heart_notes);
    const base = parseNotes(data.base_notes);
    const accords = parseNotes(data.accords);
    const allNotes = [...top, ...heart, ...base];
    const mapped = buildMolecularHintsFromNotes(allNotes);
    const similar = [];
    const evidenceMolecules = [];

    // Always keep a healthy candidate pool from the initial DB hit.
    // This prevents "only 3 suggestions" cases when model output is sparse.
    sorted.slice(1, 28).forEach((row) => {
      addUniqueCandidate(similar, row, 'Arama sinyalinde yakin profil adayi.');
    });

    if (cleanString(data.brand)) {
      const { data: byBrand } = await client
        .from(table)
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
      const noteColumns = ['top_notes', 'heart_notes', 'base_notes', 'accords'];
      for (const column of noteColumns) {
        const { data: noteMatches, error: noteError } = await client
          .from(table)
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
      rating: Number.isFinite(Number(data.rating)) ? Number(data.rating) : null,
      priceTier: cleanString(data.price_tier) || null,
      top,
      heart,
      base,
      accords,
      mapped,
      similar,
      evidenceMolecules,
    };
  } catch {
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
