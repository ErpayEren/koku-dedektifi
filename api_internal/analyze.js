const { cleanString, setCorsHeaders, setSecurityHeaders } = require('../lib/server/config');
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

const FAMILY_SIMILAR_FALLBACKS = {
  Gourmand: [
    { name: 'Black Opium', brand: 'Yves Saint Laurent', priceRange: 'premium' },
    { name: 'Flowerbomb', brand: 'Viktor&Rolf', priceRange: 'premium' },
    { name: 'Shalimar', brand: 'Guerlain', priceRange: 'luxury' },
  ],
  Odunsu: [
    { name: 'Sauvage', brand: 'Dior', priceRange: 'premium' },
    { name: 'Aventus', brand: 'Creed', priceRange: 'luxury' },
    { name: 'Layton', brand: 'Parfums de Marly', priceRange: 'luxury' },
  ],
  Aromatik: [
    { name: 'Sauvage', brand: 'Dior', priceRange: 'premium' },
    { name: 'Acqua di Gio Profondo', brand: 'Giorgio Armani', priceRange: 'premium' },
    { name: 'Luna Rossa Carbon', brand: 'Prada', priceRange: 'premium' },
  ],
  Ciceksi: [
    { name: 'No.5', brand: 'Chanel', priceRange: 'luxury' },
    { name: 'For Her', brand: 'Narciso Rodriguez', priceRange: 'premium' },
    { name: 'Portrait of a Lady', brand: 'Frederic Malle', priceRange: 'ultra-luxury' },
  ],
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
    const hit = noteMoleculeMap[normalizeNoteKey(note)];
    if (!hit || !Array.isArray(hit.molecules)) continue;

    for (const moleculeName of hit.molecules) {
      const cleaned = cleanString(moleculeName);
      if (!cleaned) continue;
      const key = cleaned.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push({
        name: cleaned,
        smiles: '',
        formula: '',
        family: cleanString(hit.accord_family) || '',
        origin: '',
        note,
        contribution: `${note} notasinin karakterini tasiyan savunulabilir bir molekuler bilesen.`,
        effect: `${cleanString(hit.accord_family) || 'Akor'} yapisini destekler.`,
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

  const maxCount = isPro ? 10 : 3;
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
    if (name.toLowerCase() === cleanString(analysis.name).toLowerCase()) continue;

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
  if (current.length > 0) return;

  const maxCount = isPro ? 10 : 3;
  const familyKey = cleanString(analysis.family)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');

  const pool =
    FAMILY_SIMILAR_FALLBACKS[cleanString(analysis.family)] ||
    FAMILY_SIMILAR_FALLBACKS[familyKey] ||
    FAMILY_SIMILAR_FALLBACKS.Aromatik;

  const picked = pool
    .filter((item) => cleanString(item.name).toLowerCase() !== cleanString(analysis.name).toLowerCase())
    .slice(0, maxCount)
    .map((item) => ({
      name: item.name,
      brand: item.brand,
      reason: `${analysis.family || 'Benzer'} aile karakterinde yakin bir profil.`,
      priceRange: item.priceRange || 'Fiyat bilgisi yok',
    }));

  if (picked.length === 0) return;
  analysis.similarFragrances = picked;
  analysis.similar = picked.map((item) => `${item.brand} ${item.name}`.trim());
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
    .slice(0, isPro ? 10 : 3)
    .map((item) => ({
      name: cleanString(item?.name),
      brand: cleanString(item?.brand),
      reason: cleanString(item?.reason) || 'Benzer profil omurgası.',
      priceRange: cleanString(item?.priceTier) || 'Fiyat bilgisi yok',
    }))
    .filter((item) => item.name);

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
  const perfumeContext = await findPerfumeContextByInput(input);
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
      const stableFallback = applySafetyFallbacks(fallbackAnalysis, perfumeContext, isPro);

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
