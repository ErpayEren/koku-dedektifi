const { cleanString, setCorsHeaders, setSecurityHeaders } = require('../lib/server/config');
const { createClient } = require('@supabase/supabase-js');
const { resolveSupabaseConfig } = require('../lib/server/supabase-config');
const { readAuthSession } = require('../lib/server/auth-session');
const { readEntitlementForUser } = require('../lib/server/billing-store');
const { callAIProvider } = require('../lib/server/provider-router');
const { enforceDailyAnalysisQuota } = require('../lib/server/plan-guard');
const { buildPerfumeAnalysisSystemPrompt, findPerfumeContextByInput } = require('../lib/server/perfume-analysis-prompt');
const noteMoleculeMap = require('../lib/nota_molecules.json');
const {
  buildAnalysisResponseSchema,
  extractJsonObject,
  normalizeAiAnalysisToResult,
  persistAnalysisRecord,
} = require('../lib/server/core-analysis.cjs');

const LAST_RESORT_SIMILAR_FALLBACKS = {
  Gourmand: [
    { name: 'Black Opium', brand: 'Yves Saint Laurent', priceRange: 'premium' },
    { name: 'Flowerbomb', brand: 'Viktor&Rolf', priceRange: 'premium' },
    { name: 'Shalimar', brand: 'Guerlain', priceRange: 'luxury' },
    { name: 'Angel', brand: 'Thierry Mugler', priceRange: 'premium' },
    { name: 'Naxos', brand: 'Xerjoff', priceRange: 'luxury' },
    { name: 'Layton', brand: 'Parfums de Marly', priceRange: 'luxury' },
    { name: 'Replica Jazz Club', brand: 'Maison Margiela', priceRange: 'premium' },
    { name: 'Black Orchid', brand: 'Tom Ford', priceRange: 'luxury' },
  ],
  Odunsu: [
    { name: 'Sauvage', brand: 'Dior', priceRange: 'premium' },
    { name: 'Aventus', brand: 'Creed', priceRange: 'luxury' },
    { name: 'Layton', brand: 'Parfums de Marly', priceRange: 'luxury' },
    { name: 'Interlude Man', brand: 'Amouage', priceRange: 'luxury' },
    { name: 'Oud for Greatness', brand: 'Initio', priceRange: 'ultra-luxury' },
    { name: 'African Leather', brand: 'Memo Paris', priceRange: 'luxury' },
    { name: 'Wood Sage & Sea Salt', brand: 'Jo Malone', priceRange: 'premium' },
    { name: 'By the Fireplace', brand: 'Maison Margiela', priceRange: 'premium' },
  ],
  Aromatik: [
    { name: 'Sauvage', brand: 'Dior', priceRange: 'premium' },
    { name: 'Acqua di Gio Profondo', brand: 'Giorgio Armani', priceRange: 'premium' },
    { name: 'Luna Rossa Carbon', brand: 'Prada', priceRange: 'premium' },
    { name: 'Aventus', brand: 'Creed', priceRange: 'luxury' },
    { name: 'Wood Sage & Sea Salt', brand: 'Jo Malone', priceRange: 'premium' },
    { name: 'Gypsy Water', brand: 'Byredo', priceRange: 'luxury' },
    { name: 'Orange Sanguine', brand: 'Atelier Cologne', priceRange: 'premium' },
    { name: 'Sauvage Elixir', brand: 'Dior', priceRange: 'premium' },
  ],
  Ciceksi: [
    { name: 'No.5', brand: 'Chanel', priceRange: 'luxury' },
    { name: 'For Her', brand: 'Narciso Rodriguez', priceRange: 'premium' },
    { name: 'Portrait of a Lady', brand: 'Frederic Malle', priceRange: 'ultra-luxury' },
    { name: 'Flowerbomb', brand: 'Viktor&Rolf', priceRange: 'premium' },
    { name: 'Shalimar', brand: 'Guerlain', priceRange: 'luxury' },
    { name: 'Black Orchid', brand: 'Tom Ford', priceRange: 'luxury' },
    { name: 'Mon Paris', brand: 'Yves Saint Laurent', priceRange: 'premium' },
    { name: 'Delina', brand: 'Parfums de Marly', priceRange: 'luxury' },
  ],
};

const FAMILY_TO_ACCORD_HINTS = {
  gourmand: ['gourmand', 'sweet', 'vanilla', 'caramel', 'dessert'],
  odunsu: ['woody', 'wood', 'amber', 'oud', 'earthy'],
  aromatik: ['aromatic', 'fougere', 'fresh spicy', 'herbal', 'green'],
  ciceksi: ['floral', 'rose', 'white floral', 'powdery', 'iris'],
  oryantal: ['oriental', 'amber', 'resinous', 'incense', 'spicy'],
  fresh: ['fresh', 'citrus', 'aquatic', 'marine', 'green'],
};

const FAMILY_NOTE_FALLBACKS = {
  Gourmand: {
    top: ['Bergamot', 'Kirmizi meyveler'],
    middle: ['Pralin', 'Bal'],
    base: ['Vanilya', 'Patchouli', 'Tonka'],
  },
  Odunsu: {
    top: ['Bergamot', 'Karabiber'],
    middle: ['Lavanta', 'Sedir'],
    base: ['Vetiver', 'Patchouli', 'Amber'],
  },
  Aromatik: {
    top: ['Bergamot', 'Limon'],
    middle: ['Lavanta', 'Ada cayi'],
    base: ['Amber', 'Misk'],
  },
  Ciceksi: {
    top: ['Neroli', 'Bergamot'],
    middle: ['Yasemin', 'Gul'],
    base: ['Misk', 'Sandal'],
  },
};

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body && typeof body === 'object' ? body : null;
}

function isValidMode(mode) {
  return mode === 'text' || mode === 'notes' || mode === 'image';
}

function normalizeImageInput(imageBase64) {
  const trimmed = cleanString(imageBase64);
  if (!trimmed) return '';
  if (trimmed.startsWith('data:image/')) return trimmed;
  return `data:image/jpeg;base64,${trimmed}`;
}

function buildMessages(body) {
  if (body.mode === 'image') {
    return [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Bu gorseli parfum uzmani gibi analiz et. Eger etiket gorunuyorsa urunu tani; gorunmuyorsa gorselin koku karakterine gore en savunulabilir profili uret. Kullanici notu: ${
              body.input || 'Gorsel analizi'
            }`,
          },
          {
            type: 'image_url',
            image_url: {
              url: normalizeImageInput(body.imageBase64 || ''),
            },
          },
        ],
      },
    ];
  }

  const prefix = body.mode === 'notes' ? 'Asagidaki nota listesine gore analiz yap:' : 'Asagidaki parfum/koku girdisini analiz et:';
  return [
    {
      role: 'user',
      content: `${prefix}\n${body.input}`,
    },
  ];
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

function resolveNoteMapEntry(note) {
  const key = normalizeNoteKey(note);
  if (!key) return null;
  return noteMoleculeMap[key] || null;
}

function resolveMappedMoleculeRows(entry) {
  if (!entry || typeof entry !== 'object') return [];

  if (Array.isArray(entry.key_molecules) && entry.key_molecules.length > 0) {
    return entry.key_molecules
      .map((item) => ({
        name: cleanString(item?.name),
        role: cleanString(item?.role) || 'temel taşıyıcı',
        odorDescriptor: cleanString(item?.odor_descriptor),
      }))
      .filter((item) => item.name);
  }

  if (Array.isArray(entry.molecules) && entry.molecules.length > 0) {
    return entry.molecules
      .map((name) => ({
        name: cleanString(name),
        role: 'temel taşıyıcı',
        odorDescriptor: '',
      }))
      .filter((item) => item.name);
  }

  return [];
}

function normalizeFragranceKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function isSameFragrance(analysis, name, brand) {
  const candidateName = cleanString(name);
  if (!candidateName) return false;
  const candidateBrand = cleanString(brand);
  const candidateKeys = [
    normalizeFragranceKey(candidateName),
    normalizeFragranceKey(`${candidateBrand} ${candidateName}`),
  ].filter(Boolean);

  const targetName = cleanString(analysis?.name);
  const targetBrand = cleanString(analysis?.brand);
  const targetKeys = [
    normalizeFragranceKey(targetName),
    normalizeFragranceKey(`${targetBrand} ${targetName}`),
  ].filter(Boolean);

  return candidateKeys.some((key) => targetKeys.includes(key));
}

function normalizeToken(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanString(item)).filter(Boolean);
  }
  const text = cleanString(value);
  if (!text) return [];
  return text
    .split(/[,;|/]/)
    .map((item) => cleanString(item))
    .filter(Boolean);
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

function collectAnalysisNotes(analysis) {
  if (!analysis || typeof analysis !== 'object') return [];
  const top = Array.isArray(analysis?.pyramid?.top) ? analysis.pyramid.top : [];
  const middle = Array.isArray(analysis?.pyramid?.middle) ? analysis.pyramid.middle : [];
  const base = Array.isArray(analysis?.pyramid?.base) ? analysis.pyramid.base : [];
  return uniqueValues([...top, ...middle, ...base]).slice(0, 16);
}

function getFamilyAccordHints(family) {
  const normalized = normalizeToken(family).replace(/\s+/g, '');
  const entries = Object.entries(FAMILY_TO_ACCORD_HINTS);
  for (const [key, hints] of entries) {
    if (normalized.includes(key)) return hints;
  }
  return [];
}

function buildSimilarReason(sharedNotes, familyMatched, family) {
  if (sharedNotes.length > 0) {
    return `"${sharedNotes.slice(0, 2).join(', ')}" notalarında yakın profil.`;
  }
  if (familyMatched && cleanString(family)) {
    return `${family} karakterine yakın bir profil.`;
  }
  return 'Koku omurgasında benzer yapı gösteriyor.';
}

function applySimilarFragrances(analysis, candidates, isPro) {
  if (!analysis || !Array.isArray(candidates) || candidates.length === 0) return;
  const maxCount = isPro ? 10 : 6;
  const current = Array.isArray(analysis.similarFragrances)
    ? analysis.similarFragrances.filter((item) => cleanString(item?.name))
    : [];
  const merged = [];
  const seen = new Set();

  [...candidates, ...current].forEach((item) => {
    const name = cleanString(item?.name);
    if (!name) return;
    const brand = cleanString(item?.brand);
    const key = `${brand.toLowerCase()}::${name.toLowerCase()}`;
    if (seen.has(key)) return;
    if (isSameFragrance(analysis, name, brand)) return;
    seen.add(key);
    merged.push({
      name,
      brand,
      reason: cleanString(item?.reason) || 'Benzer profil.',
      priceRange: cleanString(item?.priceRange || item?.priceTier) || 'Fiyat bilgisi yok',
    });
  });

  const limited = merged.slice(0, maxCount);
  if (limited.length === 0) return;
  analysis.similarFragrances = limited;
  analysis.similar = limited.map((item) => `${item.brand} ${item.name}`.trim());
  analysis.dupes = analysis.similar.slice(0, Math.min(3, analysis.similar.length));
}

async function getDBSimilarFragrances(analysis, isPro) {
  const config = resolveSupabaseConfig();
  if (!config.url || !config.serviceRoleKey) return [];

  const table =
    cleanString(process.env.SUPABASE_PERFUMES_TABLE) ||
    cleanString(process.env.SUPABASE_FRAGRANCES_TABLE) ||
    'fragrances';

  const notes = collectAnalysisNotes(analysis);
  const familyHints = getFamilyAccordHints(analysis?.family);
  const [topAnchor, middleAnchor, baseAnchor] = [
    cleanString(Array.isArray(analysis?.pyramid?.top) ? analysis.pyramid.top[0] : ''),
    cleanString(Array.isArray(analysis?.pyramid?.middle) ? analysis.pyramid.middle[0] : ''),
    cleanString(Array.isArray(analysis?.pyramid?.base) ? analysis.pyramid.base[0] : ''),
  ];

  const client = createClient(config.url, config.serviceRoleKey, { auth: { persistSession: false } });
  const selectCols = 'name,brand,price_tier,top_notes,heart_notes,base_notes,character_tags';
  const queries = [];

  if (familyHints.length > 0) {
    queries.push(client.from(table).select(selectCols).overlaps('character_tags', familyHints).limit(200));
  }
  if (topAnchor) {
    queries.push(client.from(table).select(selectCols).contains('top_notes', [topAnchor]).limit(140));
  }
  if (middleAnchor) {
    queries.push(client.from(table).select(selectCols).contains('heart_notes', [middleAnchor]).limit(140));
  }
  if (baseAnchor) {
    queries.push(client.from(table).select(selectCols).contains('base_notes', [baseAnchor]).limit(140));
  }
  if (queries.length === 0 && notes[0]) {
    queries.push(client.from(table).select(selectCols).contains('top_notes', [notes[0]]).limit(120));
  }
  if (queries.length === 0) return [];

  const responses = await Promise.race([
    Promise.all(queries),
    new Promise((_, reject) => setTimeout(() => reject(new Error('db_similarity_timeout')), 2000)),
  ]).catch(() => null);
  if (!responses) return [];

  const noteKeySet = new Set(notes.map((item) => normalizeToken(item)).filter(Boolean));
  const familyKeySet = new Set(familyHints.map((item) => normalizeToken(item)).filter(Boolean));
  const candidateMap = new Map();
  const maxCount = isPro ? 10 : 6;

  responses.forEach((response) => {
    if (!response || response.error || !Array.isArray(response.data)) return;
    response.data.forEach((row) => {
      const name = cleanString(row?.name);
      const brand = cleanString(row?.brand);
      if (!name) return;
      if (isSameFragrance(analysis, name, brand)) return;

      const rowNotes = uniqueValues([
        ...toStringArray(row?.top_notes),
        ...toStringArray(row?.heart_notes),
        ...toStringArray(row?.base_notes),
      ]);
      const rowAccords = uniqueValues(toStringArray(row?.character_tags));
      const sharedNotes = rowNotes.filter((item) => noteKeySet.has(normalizeToken(item)));
      const familyMatched = rowAccords.some((item) => familyKeySet.has(normalizeToken(item)));

      const score = sharedNotes.length * 14 + (familyMatched ? 26 : 0) + Math.min(rowNotes.length, 6);
      if (score <= 0) return;

      const key = `${brand.toLowerCase()}::${name.toLowerCase()}`;
      const existing = candidateMap.get(key);
      const candidate = {
        name,
        brand,
        reason: buildSimilarReason(sharedNotes, familyMatched, analysis?.family),
        priceRange: cleanString(row?.price_tier) || 'Fiyat bilgisi yok',
        score,
      };
      if (!existing || candidate.score > existing.score) {
        candidateMap.set(key, candidate);
      }
    });
  });

  return Array.from(candidateMap.values())
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, maxCount);
}

function buildFallbackMolecules(perfumeContext, isPro) {
  if (!perfumeContext) return [];

  const orderedNotes = [...(perfumeContext.top || []), ...(perfumeContext.heart || []), ...(perfumeContext.base || [])]
    .map((item) => cleanString(item))
    .filter(Boolean);

  const maxCount = isPro ? 8 : 4;
  const pool = [];
  const seen = new Set();

  const evidenceRows = Array.isArray(perfumeContext.evidenceMolecules) ? perfumeContext.evidenceMolecules : [];
  evidenceRows.forEach((entry) => {
    if (pool.length >= maxCount) return;
    const name = cleanString(entry?.name);
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    const matchedNotes = Array.isArray(entry?.matchedNotes)
      ? entry.matchedNotes.map((item) => cleanString(item)).filter(Boolean)
      : [];
    const firstNote = matchedNotes[0] || orderedNotes[0] || 'Koku omurgasi';

    pool.push({
      name,
      smiles: '',
      formula: '',
      family: '',
      origin: '',
      note: firstNote,
      contribution: cleanString(entry?.evidenceReason) || `${name} bu parfum omurgasinda savunulabilir bir iz verir.`,
      effect: `${name} koku iskeletini destekler.`,
      percentage: !isPro && pool.length > 0 ? 'Pro ile goruntule' : 'Kanitli bag',
      evidenceLevel: cleanString(entry?.evidenceLevel) || 'note_match',
      evidenceLabel: 'Nota Eslesmesi',
      evidenceReason: cleanString(entry?.evidenceReason) || 'Kanit tablosundan eslesti.',
      matchedNotes,
    });
  });

  if (orderedNotes.length === 0 && pool.length > 0) {
    return pool;
  }

  for (const note of orderedNotes) {
    const hit = resolveNoteMapEntry(note);
    const mappedMolecules = resolveMappedMoleculeRows(hit);
    if (!hit || mappedMolecules.length === 0) continue;

    for (const molecule of mappedMolecules) {
      const cleaned = cleanString(molecule.name);
      if (!cleaned) continue;
      const key = cleaned.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const accordFamily = cleanString(hit.family || hit.accord_family) || '';
      const noteCharacter = cleanString(hit.character);
      const descriptor = cleanString(molecule.odorDescriptor);
      const roleHint = cleanString(molecule.role) || 'temel taşıyıcı';

      pool.push({
        name: cleaned,
        smiles: '',
        formula: '',
        family: accordFamily,
        origin: '',
        note,
        contribution:
          noteCharacter ||
          `${note} notasinin karakterini tasiyan savunulabilir bir molekuler bilesen.`,
        effect:
          descriptor ||
          `${accordFamily || 'Akor'} yapisini destekleyen ${roleHint.toLowerCase()} bir etki.`,
        percentage: !isPro && pool.length > 0 ? 'Pro ile goruntule' : 'Akor tasiyici',
        evidenceLevel: 'note_match',
        evidenceLabel: 'Nota Eslesmesi',
        evidenceReason: `"${note}" notasiyla eslesen molekul bagi.`,
        matchedNotes: [note],
      });
      if (pool.length >= maxCount) break;
    }
    if (pool.length >= maxCount) break;
  }

  return pool;
}

function enrichSimilarFragrances(analysis, perfumeContext, isPro) {
  if (!analysis || !perfumeContext) return;

  const maxCount = isPro ? 10 : 6;
  const current = Array.isArray(analysis.similarFragrances)
    ? analysis.similarFragrances.filter((item) => cleanString(item?.name))
    : [];
  const seen = new Set(
    current.map((item) => `${cleanString(item.brand).toLowerCase()}::${cleanString(item.name).toLowerCase()}`),
  );

  const contextSimilar = Array.isArray(perfumeContext.similar) ? perfumeContext.similar : [];
  for (const item of contextSimilar) {
    const name = cleanString(item?.name);
    if (!name) continue;
    const brand = cleanString(item?.brand);
    const key = `${brand.toLowerCase()}::${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    if (isSameFragrance(analysis, name, brand)) continue;

    current.push({
      name,
      brand,
      reason: cleanString(item.reason) || 'Benzer akor omurgasi.',
      priceRange: cleanString(item.priceTier) || 'Fiyat bilgisi yok',
    });
    seen.add(key);
    if (current.length >= maxCount) break;
  }

  if (current.length === 0) return;

  analysis.similarFragrances = current.slice(0, maxCount);
  analysis.similar = analysis.similarFragrances.map((item) =>
    `${cleanString(item.brand)} ${cleanString(item.name)}`.trim(),
  );
  analysis.dupes = analysis.similar.slice(0, Math.min(3, analysis.similar.length));
}

function fallbackSimilarByFamily(analysis, isPro) {
  if (!analysis) return;
  const current = Array.isArray(analysis.similarFragrances)
    ? analysis.similarFragrances.filter((item) => cleanString(item?.name))
    : [];
  const maxCount = isPro ? 10 : 6;
  const minVisibleCount = isPro ? 8 : 6;
  if (current.length >= minVisibleCount) return;
  const familyKey = cleanString(analysis.family)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');

  const pool =
    LAST_RESORT_SIMILAR_FALLBACKS[cleanString(analysis.family)] ||
    LAST_RESORT_SIMILAR_FALLBACKS[familyKey] ||
    LAST_RESORT_SIMILAR_FALLBACKS.Aromatik;

  const seen = new Set(
    current.map((item) => `${cleanString(item.brand).toLowerCase()}::${cleanString(item.name).toLowerCase()}`),
  );
  const picked = current.slice();
  for (const item of pool) {
    const name = cleanString(item.name);
    if (!name) continue;
    const brand = cleanString(item.brand);
    if (isSameFragrance(analysis, name, brand)) continue;
    const key = `${brand.toLowerCase()}::${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    picked.push({
      name: item.name,
      brand: item.brand,
      reason: `${analysis.family || 'Benzer'} aile karakterinde yakin bir profil.`,
      priceRange: item.priceRange || 'Fiyat bilgisi yok',
    });
    seen.add(key);
    if (picked.length >= maxCount) break;
  }

  if (picked.length === 0) return;
  const normalized = picked.slice(0, maxCount);
  analysis.similarFragrances = normalized;
  analysis.similar = normalized.map((item) => `${item.brand} ${item.name}`.trim());
  analysis.dupes = analysis.similar.slice(0, Math.min(3, analysis.similar.length));
}

function ensurePyramidNotes(analysis, perfumeContext) {
  if (!analysis || !perfumeContext) return;
  if (!analysis.pyramid || typeof analysis.pyramid !== 'object') {
    analysis.pyramid = { top: [], middle: [], base: [] };
  }

  if ((!Array.isArray(analysis.pyramid.top) || analysis.pyramid.top.length === 0) && Array.isArray(perfumeContext.top)) {
    analysis.pyramid.top = perfumeContext.top.slice(0, 6);
  }
  if (
    (!Array.isArray(analysis.pyramid.middle) || analysis.pyramid.middle.length === 0) &&
    Array.isArray(perfumeContext.heart)
  ) {
    analysis.pyramid.middle = perfumeContext.heart.slice(0, 8);
  }
  if ((!Array.isArray(analysis.pyramid.base) || analysis.pyramid.base.length === 0) && Array.isArray(perfumeContext.base)) {
    analysis.pyramid.base = perfumeContext.base.slice(0, 8);
  }
}

function fillPyramidFromFamilyFallback(analysis) {
  if (!analysis) return;
  if (!analysis.pyramid || typeof analysis.pyramid !== 'object') {
    analysis.pyramid = { top: [], middle: [], base: [] };
  }

  const familyKey = cleanString(analysis.family)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');
  const fallback =
    FAMILY_NOTE_FALLBACKS[cleanString(analysis.family)] ||
    FAMILY_NOTE_FALLBACKS[familyKey] ||
    FAMILY_NOTE_FALLBACKS.Aromatik;
  if (!fallback) return;

  if (!Array.isArray(analysis.pyramid.top) || analysis.pyramid.top.length === 0) {
    analysis.pyramid.top = fallback.top.slice(0, 6);
  }
  if (!Array.isArray(analysis.pyramid.middle) || analysis.pyramid.middle.length === 0) {
    analysis.pyramid.middle = fallback.middle.slice(0, 8);
  }
  if (!Array.isArray(analysis.pyramid.base) || analysis.pyramid.base.length === 0) {
    analysis.pyramid.base = fallback.base.slice(0, 8);
  }
}

function applySafetyFallbacks(analysis, perfumeContext, isPro) {
  if (!analysis) return analysis;

  ensurePyramidNotes(analysis, perfumeContext);
  fillPyramidFromFamilyFallback(analysis);

  const molecules = Array.isArray(analysis.molecules) ? analysis.molecules.filter((item) => cleanString(item?.name)) : [];
  if (molecules.length === 0) {
    analysis.molecules = buildFallbackMolecules(perfumeContext, isPro);
  }

  const postContextMolecules = Array.isArray(analysis.molecules)
    ? analysis.molecules.filter((item) => cleanString(item?.name))
    : [];
  if (postContextMolecules.length === 0) {
    analysis.molecules = buildFallbackMolecules(
      {
        top: Array.isArray(analysis?.pyramid?.top) ? analysis.pyramid.top : [],
        heart: Array.isArray(analysis?.pyramid?.middle) ? analysis.pyramid.middle : [],
        base: Array.isArray(analysis?.pyramid?.base) ? analysis.pyramid.base : [],
        evidenceMolecules: [],
      },
      isPro,
    );
  }

  enrichSimilarFragrances(analysis, perfumeContext, isPro);
  fallbackSimilarByFamily(analysis, isPro);
  return analysis;
}

function buildEmergencyPayload({ input, mode, isPro, perfumeContext, providerError }) {
  const name = cleanString(perfumeContext?.name) || cleanString(input) || 'Bilinmeyen Koku';
  const brand = cleanString(perfumeContext?.brand) || null;
  const family = cleanString(perfumeContext?.family) || 'Aromatik';
  const top = Array.isArray(perfumeContext?.top) ? perfumeContext.top.slice(0, 6) : [];
  const heart = Array.isArray(perfumeContext?.heart) ? perfumeContext.heart.slice(0, 8) : [];
  const base = Array.isArray(perfumeContext?.base) ? perfumeContext.base.slice(0, 8) : [];
  const fallbackMolecules = buildFallbackMolecules(perfumeContext, isPro).slice(0, isPro ? 6 : 2);
  const fallbackSimilar = (Array.isArray(perfumeContext?.similar) ? perfumeContext.similar : [])
    .slice(0, isPro ? 10 : 6)
    .map((item) => ({
      name: cleanString(item?.name),
      brand: cleanString(item?.brand),
      reason: cleanString(item?.reason) || 'Benzer profil omurgası.',
      priceRange: cleanString(item?.priceTier) || 'Fiyat bilgisi yok',
    }))
    .filter((item) => item.name && !isSameFragrance({ name, brand }, item.name, item.brand));

  return {
    name,
    brand,
    year: Number.isFinite(Number(perfumeContext?.year)) ? Number(perfumeContext.year) : null,
    family,
    concentration: cleanString(perfumeContext?.concentration) || null,
    topNotes: top,
    heartNotes: heart,
    baseNotes: base,
    keyMolecules: fallbackMolecules.map((item, index) => ({
      name: item.name,
      effect: item.effect || item.contribution || `${item.name} bu koku omurgasını destekler.`,
      percentage: index > 0 && !isPro ? 'Pro ile görüntüle' : item.percentage || 'Akor taşıyıcı',
    })),
    sillage: cleanString(perfumeContext?.sillage) || 'orta',
    longevityHours: {
      min: cleanString(perfumeContext?.longevity).includes('3')
        ? 3
        : cleanString(perfumeContext?.longevity).includes('8')
          ? 8
          : 4,
      max: cleanString(perfumeContext?.longevity).includes('12')
        ? 12
        : cleanString(perfumeContext?.longevity).includes('8')
          ? 8
          : 7,
    },
    seasons: Array.isArray(perfumeContext?.seasons) && perfumeContext.seasons.length > 0 ? perfumeContext.seasons : ['İlkbahar', 'Sonbahar'],
    occasions: Array.isArray(perfumeContext?.occasions) && perfumeContext.occasions.length > 0 ? perfumeContext.occasions : ['Günlük'],
    ageProfile: cleanString(perfumeContext?.ageProfile) || 'Yetişkin profil',
    genderProfile: cleanString(perfumeContext?.genderProfile) || cleanString(perfumeContext?.gender) || 'Unisex',
    moodProfile: `${name} için geçici yoğunluk fallback analizi üretildi. Koku karakteri ${family.toLowerCase()} omurgaya yaslanıyor.`,
    expertComment:
      'Sağlayıcı yoğunluğu nedeniyle yorum fallback katmanından üretildi. Notalar ve molekül eşleşmeleri katalog verisiyle tutarlı şekilde işlendi. Kısa süre içinde tekrar analiz edersen model çıktısı otomatik güncellenecektir.',
    layeringTip: isPro ? 'Benzer ailede temiz bir açılış notasıyla katmanlayarak derinliği dengede tut.' : 'Pro ile görüntüle',
    applicationTip: isPro ? 'Tenin sıcak noktalarına 2-3 fıs uygula, 20 dakika sonra ikinci katmanı değerlendir.' : 'Pro ile görüntüle',
    similarFragrances: fallbackSimilar,
    valueScore: 7,
    uniquenessScore: 7,
    wearabilityScore: 8,
    __fallbackReason: cleanString(providerError) || 'provider_unavailable',
    __fallbackMode: mode,
  };
}

module.exports = async function analyzeHandler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res, { methods: 'POST, OPTIONS', headers: 'Content-Type' })) {
    return res.status(403).json({ error: 'Bu origin icin erisim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await readAuthSession(req);

  try {
    await enforceDailyAnalysisQuota(req);
  } catch (error) {
    const status = Number(error?.statusCode || 429);
    const body = error?.body || { error: 'Gunluk analiz limitine ulasildi.' };
    return res.status(status).json(body);
  }

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Gecersiz JSON govdesi.' });

  if (!isValidMode(body.mode)) {
    return res.status(400).json({ error: 'mode alani text, notes veya image olmali.' });
  }

  const input = cleanString(body.input);
  if (!input && body.mode !== 'image') {
    return res.status(400).json({ error: 'input alani gerekli.' });
  }

  if (body.mode === 'image' && !cleanString(body.imageBase64)) {
    return res.status(400).json({ error: 'imageBase64 alani gerekli.' });
  }

  const entitlement = auth?.user?.id ? await readEntitlementForUser(auth.user.id) : { tier: 'free' };
  const isPro = entitlement?.tier === 'pro';
  const perfumeContext = await findPerfumeContextByInput(input, {
    allowVector: body.mode === 'text' || body.mode === 'notes',
  });
  const systemPrompt = buildPerfumeAnalysisSystemPrompt({
    isPro,
    perfumeContext,
  });

  const providerResponse = await callAIProvider(
    buildMessages({ mode: body.mode, input, imageBase64: body.imageBase64 }),
    'analysis',
    {
      systemPrompt,
      hasImage: body.mode === 'image',
      useWebSearch: false,
      responseJsonSchema: buildAnalysisResponseSchema(),
    },
  );

  if (!providerResponse.ok || !providerResponse.formatted) {
    try {
      const fallbackPayload = buildEmergencyPayload({
        input,
        mode: body.mode,
        isPro,
        perfumeContext,
        providerError: providerResponse.error,
      });
      const fallbackAnalysis = normalizeAiAnalysisToResult({
        payload: fallbackPayload,
        mode: body.mode,
        inputText: input,
        isPro,
      });
      const dbSimilarFallback = await getDBSimilarFragrances(fallbackAnalysis, isPro);
      applySimilarFragrances(fallbackAnalysis, dbSimilarFallback, isPro);
      const stableFallback = applySafetyFallbacks(fallbackAnalysis, perfumeContext, isPro);
      stableFallback.dataConfidence = {
        hasDbMatch: Boolean(perfumeContext),
        source: perfumeContext ? 'db' : 'ai',
      };

      const persisted = await persistAnalysisRecord({
        analysis: stableFallback,
        mode: body.mode,
        inputText: input,
        appUserId: auth?.user?.id || null,
      });

      const result = persisted
        ? {
            ...stableFallback,
            id: persisted.id,
            createdAt: persisted.createdAt,
          }
        : stableFallback;

      return res.status(200).json({
        analysis: result,
        plan: isPro ? 'pro' : 'free',
        stored: Boolean(persisted),
        degraded: true,
        providerError: providerResponse.error || 'provider_unavailable',
      });
    } catch (fallbackError) {
      console.error('[api/analyze] provider+fallback failed:', fallbackError);
      return res.status(providerResponse.status || 502).json({
        error: providerResponse.error || 'Analiz olusturulamadi.',
      });
    }
  }

  try {
    const payload = extractJsonObject(providerResponse.formatted);
    const analysis = normalizeAiAnalysisToResult({
      payload,
      mode: body.mode,
      inputText: input,
      isPro,
    });
    const dbSimilar = await getDBSimilarFragrances(analysis, isPro);
    applySimilarFragrances(analysis, dbSimilar, isPro);

    const persisted = await persistAnalysisRecord({
      analysis,
      mode: body.mode,
      inputText: input,
      appUserId: auth?.user?.id || null,
    });

    const finalResult = persisted
      ? {
          ...analysis,
          id: persisted.id,
          createdAt: persisted.createdAt,
        }
      : analysis;

    const stableResult = applySafetyFallbacks(finalResult, perfumeContext, isPro);
    stableResult.dataConfidence = {
      hasDbMatch: Boolean(perfumeContext),
      source: perfumeContext ? 'db' : 'ai',
    };

    return res.status(200).json({
      analysis: stableResult,
      plan: isPro ? 'pro' : 'free',
      stored: Boolean(persisted),
    });
  } catch (error) {
    console.error('[api/analyze] normalization failed:', error);
    return res.status(500).json({ error: 'Analiz cevabi islenemedi.' });
  }
};
