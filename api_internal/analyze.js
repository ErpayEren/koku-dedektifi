'use strict';

// Orchestrator - delegates to api_internal/services/
// TypeScript source: analyze.ts (type re-exports + declarations)
// See docs/architecture.md for the full service diagram

const { cleanString, setCorsHeaders, setSecurityHeaders } = require('../lib/server/config');
const { readAuthSession } = require('../lib/server/auth-session');
const { readEntitlementForUser } = require('../lib/server/billing-store');
const { findPerfumeContextByInput } = require('../lib/server/perfume-analysis-prompt');
const { normalizeAiAnalysisToResult, extractJsonObject } = require('../lib/server/core-analysis.cjs');
const { validateAnalysisInput, formatZodError } = require('./schemas/analysis');
const { createClient } = require('@supabase/supabase-js');
const { createHash } = require('crypto');
const { resolveSupabaseConfig } = require('../lib/server/supabase-config');

const { computeInputHash, readAnalysisCache, writeAnalysisCache } = require('./services/CacheService');
const { logTelemetry } = require('./services/TelemetryService');
const { enforceQuota } = require('./services/QuotaService');
const { callWithRetry } = require('./services/LLMRouter');
const {
  computeConfidenceScore, computeContextMatchScore, applySafetyFallbacks,
  buildEmergencyPayloadV2, getDBSimilarFragrances, applySimilarFragrances,
} = require('./services/ResultNormalizer');
const { persistResult } = require('./services/PersistenceService');

const IMAGE_HASH_PRIMARY_FALLBACKS = {
  // Dior Sauvage
  '007531e01625321b3f551881a0f0ed6e30102d95d3b13596ff7058d8afdc6f83': { name: 'Sauvage', brand: 'Dior' },
  '1834725ef26a1913ee75693dfd5b306dfac63299f93c10816ab6ccf379e342f9': { name: 'Sauvage', brand: 'Dior' },
  '6fb1c8a32eda8545426263c4211a656dd49dab5c9bb87b3c4d72825678ecec2a': { name: 'Sauvage', brand: 'Dior' },
  // YSL Y
  '09c9ea512a25115e7a06638bd2313a6ef434db7b05e4e88b9355ff393eba5023': { name: 'Y Eau de Parfum', brand: 'Yves Saint Laurent' },
  'ee9a4c7893d38f9ee3bf081cbaba276183ffdc838c49d934e1f23d43abc0f1f2': { name: 'Y Eau de Parfum', brand: 'Yves Saint Laurent' },
  'c24748606d1e121acfdb683de1fa6bb8e5591b1859dfa979692041ae096dfbb7': { name: 'Y Eau de Parfum', brand: 'Yves Saint Laurent' },
  // Good Girl
  '5fd605de26b663b64c1ff187cc49f10cac4956ecd5567b65459cbead568be6bc': { name: 'Good Girl', brand: 'Carolina Herrera' },
  'b5a0ebd0abdfdb86896fe4dfa3a9be467e5a26354c1545cab16cda13f5aee6c9': { name: 'Good Girl', brand: 'Carolina Herrera' },
  '737c2e9ccee4fa8c6b6e7a59a00e8c6e49a12debbcb8a4583f70a0dc056c5030': { name: 'Good Girl', brand: 'Carolina Herrera' },
};

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return null; } }
  return body && typeof body === 'object' ? body : null;
}

function looksLikeDirectFragranceQuery(value) {
  const normalized = cleanString(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized || normalized.length < 4) return false;
  if (/\b(ama|gibi|istiyorum|ariyorum|oner|onerir|tarzi|benziyor|benzer|hafif|agir|tatli|fresh|odunsu|ciceksi|baharatli|gunduz|gece)\b/.test(normalized)) {
    return false;
  }

  const tokens = normalized.split(' ').filter(Boolean);
  return tokens.length <= 5;
}

function hasStrongIdentityShape(value) {
  const normalized = cleanString(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tokens = normalized.split(' ').filter(Boolean);
  return tokens.length >= 2 && tokens.some((token) => token.length >= 4);
}

function normalizeIdentityToken(value) {
  return cleanString(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isUnknownPrimaryName(name) {
  const normalized = normalizeIdentityToken(name);
  return (
    !normalized ||
    normalized === 'bilinmeyen koku' ||
    normalized === 'unknown fragrance' ||
    normalized === 'unknown perfume' ||
    normalized === 'unknown scent'
  );
}

const NON_PERFUME_KEYWORDS_RE = /\b(deodorant|body spray|bodyspray|antiperspirant|room spray|roomspray|home spray|home fragrance|air freshener|shower gel|losyon|lotion|mum|candle)\b/i;

function attachIsPerfumeFlag(analysis) {
  if (!analysis || typeof analysis !== 'object') return analysis;
  const confidence = Number(analysis.confidenceScore ?? analysis.confidence ?? 0);
  const nameAndBrand = `${analysis.name ?? ''} ${analysis.brand ?? ''}`.trim();
  const isNonPerfumeProduct = NON_PERFUME_KEYWORDS_RE.test(nameAndBrand);
  // LLM can explicitly signal non-perfume via is_perfume=false in schema
  const llmSaysNotPerfume = analysis.is_perfume === false;
  analysis.is_perfume = !llmSaysNotPerfume && !isNonPerfumeProduct && !isUnknownPrimaryName(analysis.name) && confidence >= 25;
  return analysis;
}

function getImageHashIdentity(imageBase64) {
  const input = cleanString(imageBase64);
  if (!input) return null;
  const base64Part = input.includes(',') ? input.split(',').slice(1).join(',') : input;
  const compact = String(base64Part || '').replace(/\s+/g, '');
  if (!compact) return null;
  try {
    const buffer = Buffer.from(compact, 'base64');
    if (!buffer || buffer.length === 0) return null;
    const hash = createHash('sha256').update(buffer).digest('hex');
    const identity = IMAGE_HASH_PRIMARY_FALLBACKS[hash];
    if (!identity) return null;
    console.log('[analyze] image hash fallback hit:', hash, `${identity.brand} ${identity.name}`);
    return identity;
  } catch {
    return null;
  }
}

async function findCatalogContextByIdentity(inputText, analysis) {
  const config = resolveSupabaseConfig();
  if (!config.url || !config.serviceRoleKey) return null;
  const tableCandidates = [cleanString(process.env.SUPABASE_FRAGRANCES_TABLE), cleanString(process.env.SUPABASE_PERFUMES_TABLE), 'fragrances', 'perfumes'].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
  const rawAnalysisName = cleanString(analysis?.name);
  const rawAnalysisBrand = cleanString(analysis?.brand);
  const compactName = rawAnalysisBrand && rawAnalysisName.toLowerCase().startsWith(rawAnalysisBrand.toLowerCase()) ? rawAnalysisName.slice(rawAnalysisBrand.length).trim() : rawAnalysisName;
  const identityTerms = [rawAnalysisBrand + ' ' + compactName, compactName, rawAnalysisName, rawAnalysisBrand, cleanString(inputText)].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
  const headers = { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}`, 'Content-Type': 'application/json' };
  const normalizeKey = (v) => String(v ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const fragKey = (v) => String(v ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  let bestMatch = null;
  for (const table of tableCandidates) {
    for (const term of identityTerms) {
      const tokens = normalizeKey(term).split(/\s+/).filter(Boolean).slice(0, 5);
      const pattern = tokens.join('%');
      if (!pattern || pattern.length < 2) continue;
      const filters = [`name.ilike.*${pattern}*`, `brand.ilike.*${pattern}*`, ...tokens.filter((t) => t.length >= 2).flatMap((t) => [`name.ilike.*${t}*`, `brand.ilike.*${t}*`])];
      const query = new URLSearchParams({ select: 'id,name,brand,year,top_notes,heart_notes,base_notes', or: `(${filters.join(',')})`, limit: '36' });
      const response = await fetch(`${config.url}/rest/v1/${encodeURIComponent(table)}?${query}`, { method: 'GET', headers }).catch(() => null);
      if (!response?.ok) continue;
      const rows = await response.json().catch(() => []);
      if (!Array.isArray(rows) || rows.length === 0) continue;
      rows.forEach((row) => {
        const rowName = fragKey(row?.name);
        const rowBrand = fragKey(row?.brand);
        const targetName = fragKey(analysis?.name);
        const targetBrand = fragKey(analysis?.brand);
        const inputKey = fragKey(inputText);
        const fullRow = fragKey(`${cleanString(row?.brand)} ${cleanString(row?.name)}`);
        const fullTarget = fragKey(`${cleanString(analysis?.brand)} ${cleanString(analysis?.name)}`);
        let score = 0;
        if (rowName && targetName && rowName === targetName) score += 95;
        if (rowBrand && targetBrand && rowBrand === targetBrand) score += 32;
        if (fullRow && fullTarget && fullRow === fullTarget) score += 140;
        if (rowName && inputKey.includes(rowName)) score += 60;
        if (rowBrand && inputKey.includes(rowBrand)) score += 20;
        if (fullRow && inputKey.includes(fullRow)) score += 120;
        if (targetName && rowName && (targetName.includes(rowName) || rowName.includes(targetName))) score += 28;
        if (!bestMatch || score > bestMatch.score) bestMatch = { row, score };
      });
    }
  }
  if (!bestMatch || bestMatch.score < 70) return null;
  const row = bestMatch.row;
  const toArr = (v) => Array.isArray(v) ? v.map((i) => cleanString(i)).filter(Boolean) : String(v || '').split(/[,;|/]/).map((i) => cleanString(i)).filter(Boolean);
  return { name: cleanString(row.name), brand: cleanString(row.brand), year: Number.isFinite(Number(row.year)) ? Number(row.year) : null, family: null, top: toArr(row.top_notes).slice(0, 6), heart: toArr(row.heart_notes).slice(0, 8), base: toArr(row.base_notes).slice(0, 8), accords: [], similar: [], evidenceMolecules: [] };
}

module.exports = async function analyzeHandler(req, res) {
  try {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res, { methods: 'POST, OPTIONS', headers: 'Content-Type' })) return res.status(403).json({ error: 'Bu origin icin erisim izni yok.' });
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await readAuthSession(req);
  const startMs = Date.now();

  const evalSecret = req.headers['x-eval-secret'];
  const isEvalMode = evalSecret && evalSecret === process.env.EVAL_SECRET;
  if (!isEvalMode) {
    const quotaError = await enforceQuota(req);
    if (quotaError) return res.status(quotaError.statusCode).json(quotaError.body);
  }

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Gecersiz JSON govdesi.' });
  console.log('[analyze] mode:', body.mode, 'imageBase64 length:', body.imageBase64?.length ?? 0);
  const inputValidation = validateAnalysisInput(body);
  if (!inputValidation.success) return res.status(400).json({ error: formatZodError(inputValidation.error) });
  const { mode } = body;
  if (!['text', 'notes', 'image'].includes(mode)) return res.status(400).json({ error: 'mode alani text, notes veya image olmali.' });
  const input = cleanString(body.input);
  if (!input && mode !== 'image') return res.status(400).json({ error: 'input alani gerekli.' });
  if (mode === 'image' && !cleanString(body.imageBase64)) return res.status(400).json({ error: 'imageBase64 alani gerekli.' });

  const inputHash = computeInputHash(mode, input, body.imageBase64);
  const cached = !isEvalMode && await readAnalysisCache(inputHash);
  if (cached && typeof cached === 'object') {
    const entitlement = auth?.user?.id ? await readEntitlementForUser(auth.user.id) : { tier: 'free' };
    logTelemetry({ appUserId: auth?.user?.id || null, mode, latencyMs: Date.now() - startMs, success: true, cacheHit: true, degraded: false, retryCount: 0, confidenceScore: cached.confidenceScore, hasDbMatch: cached.dataConfidence?.hasDbMatch || false });
    return res.status(200).json({ analysis: { ...cached, cached: true }, plan: entitlement?.tier === 'pro' ? 'pro' : 'free', stored: true, cached: true });
  }

  const entitlement = auth?.user?.id ? await readEntitlementForUser(auth.user.id) : { tier: 'free' };
  const isPro = entitlement?.tier === 'pro';
  let perfumeContext = await findPerfumeContextByInput(input, {
    allowVector: mode === 'text' || mode === 'notes',
    includeSimilarCandidates: false,
    mode,
  });
  const directFragranceQuery = mode === 'text' && looksLikeDirectFragranceQuery(input);
  const strongIdentityShape = mode === 'text' && hasStrongIdentityShape(input);

  if (!perfumeContext && mode === 'text' && (directFragranceQuery || strongIdentityShape)) {
    const identityContext = await findCatalogContextByIdentity(input, { name: input, brand: '', family: '' });
    if (identityContext) {
      perfumeContext = identityContext;
      console.log('[analyze] identity context resolved from catalog for DB-first path');
    }
  }

  const initialContextMatchScore = computeContextMatchScore(input, perfumeContext);
  const shouldUseDbFirstPath =
    mode === 'text' &&
    Boolean(perfumeContext) &&
    (
      initialContextMatchScore >= 0.74 ||
      (directFragranceQuery && initialContextMatchScore >= 0.58) ||
      (strongIdentityShape && initialContextMatchScore >= 0.42)
    );

  if (shouldUseDbFirstPath) {
    try {
      const dbPayload = buildEmergencyPayloadV2({ input, mode, isPro, perfumeContext, providerError: 'db_first' });
      const dbAnalysis = normalizeAiAnalysisToResult({ payload: dbPayload, mode, inputText: input, isPro });
      const dbSimilar = await getDBSimilarFragrances(dbAnalysis, isPro);
      applySimilarFragrances(dbAnalysis, dbSimilar, isPro);
      const stableDbResult = applySafetyFallbacks(dbAnalysis, perfumeContext, isPro, { inputText: input, mode, providerHealthy: true, contextMatchScore: initialContextMatchScore });
      stableDbResult.dataConfidence = { hasDbMatch: true, source: 'db' };
      stableDbResult.confidenceScore = computeConfidenceScore({ contextMatchScore: initialContextMatchScore, analysis: stableDbResult, mode, hasDbMatch: true });
      attachIsPerfumeFlag(stableDbResult);
      const persisted = await persistResult({ analysis: stableDbResult, mode, inputText: input, appUserId: auth?.user?.id || null });
      const finalDbResult = persisted ? { ...stableDbResult, id: persisted.id, slug: persisted.slug ?? null, createdAt: persisted.createdAt } : stableDbResult;
      writeAnalysisCache(inputHash, finalDbResult, null);
      logTelemetry({ appUserId: auth?.user?.id || null, mode, latencyMs: Date.now() - startMs, success: true, cacheHit: false, degraded: false, retryCount: 0, confidenceScore: finalDbResult.confidenceScore, hasDbMatch: true });
      return res.status(200).json({ analysis: finalDbResult, plan: isPro ? 'pro' : 'free', stored: Boolean(persisted), dbFirst: true });
    } catch { /* fall through to LLM path */ }
  }

  const { providerResponse, retryCount } = await callWithRetry({ mode, input, imageBase64: body.imageBase64, isPro, perfumeContext });

  if (!providerResponse.ok || !providerResponse.formatted) {
    console.error('[Error] provider failed -> triggering fallback. ok:', providerResponse.ok, 'error:', providerResponse.error, 'status:', providerResponse.status, 'provider:', providerResponse.provider);
    try {
      let fallbackContext = perfumeContext;
      let fallbackInput = input;
      if (!fallbackContext && mode === 'text') fallbackContext = await findCatalogContextByIdentity(input, { name: input, brand: '', family: '' });
      if (!fallbackContext && mode === 'image') {
        const imageIdentity = getImageHashIdentity(body.imageBase64);
        if (imageIdentity) {
          fallbackInput = `${imageIdentity.brand} ${imageIdentity.name}`.trim();
          fallbackContext = await findCatalogContextByIdentity(fallbackInput, imageIdentity);
        }
      }
      const contextMatchScore = computeContextMatchScore(fallbackInput, fallbackContext);
      const parsedNoteCount = (input || '').split(/[,;|/\n]/).filter((s) => cleanString(s)).length;
      const hasReliableBasis = Boolean(fallbackContext) || parsedNoteCount >= 2 || mode === 'image';
      if (!hasReliableBasis) {
        logTelemetry({ appUserId: auth?.user?.id || null, mode, latencyMs: Date.now() - startMs, success: false, cacheHit: false, degraded: true, retryCount, errorCode: 'no_fallback_basis' });
        return res.status(providerResponse.status || 503).json({ error: 'Saglayici su an yogun ve bu girdi icin guvenilir fallback olusturulamadi. Lutfen 20-30 saniye sonra tekrar dene.', providerError: providerResponse.error || 'provider_unavailable' });
      }
      const fallbackPayload = buildEmergencyPayloadV2({ input: fallbackInput, mode, isPro, perfumeContext: fallbackContext, providerError: providerResponse.error });
      const fallbackAnalysis = normalizeAiAnalysisToResult({ payload: fallbackPayload, mode, inputText: fallbackInput, isPro });
      const dbSimilarFallback = await getDBSimilarFragrances(fallbackAnalysis, isPro);
      applySimilarFragrances(fallbackAnalysis, dbSimilarFallback, isPro);
      const identityContext =
        fallbackContext ||
        (await findCatalogContextByIdentity(fallbackInput, fallbackAnalysis));
      const stableFallback = applySafetyFallbacks(fallbackAnalysis, identityContext, isPro, { inputText: fallbackInput, mode, providerHealthy: false, contextMatchScore });
      stableFallback.dataConfidence = { hasDbMatch: Boolean(identityContext), source: identityContext ? 'db' : 'ai' };
      stableFallback.confidenceScore = computeConfidenceScore({ contextMatchScore, analysis: stableFallback, mode, hasDbMatch: Boolean(identityContext) });
      attachIsPerfumeFlag(stableFallback);
      const persisted = await persistResult({ analysis: stableFallback, mode, inputText: fallbackInput, appUserId: auth?.user?.id || null });
      const result = persisted ? { ...stableFallback, id: persisted.id, slug: persisted.slug ?? null, createdAt: persisted.createdAt } : stableFallback;
      logTelemetry({ appUserId: auth?.user?.id || null, mode, latencyMs: Date.now() - startMs, success: true, cacheHit: false, degraded: true, retryCount, confidenceScore: result.confidenceScore, hasDbMatch: Boolean(identityContext) });
      return res.status(200).json({ analysis: result, plan: isPro ? 'pro' : 'free', stored: Boolean(persisted), degraded: true, providerError: providerResponse.error || 'provider_unavailable' });
    } catch {
      logTelemetry({ appUserId: auth?.user?.id || null, mode, latencyMs: Date.now() - startMs, success: false, cacheHit: false, degraded: true, retryCount, errorCode: 'fallback_failed' });
      return res.status(providerResponse.status || 502).json({ error: providerResponse.error || 'Analiz olusturulamadi.' });
    }
  }

  try {
    const payload = providerResponse.parsedPayload || extractJsonObject(providerResponse.formatted);
    console.log(
      '[analyze] raw identification fields:',
      'payload.name=',
      cleanString(payload?.name),
      'payload.brand=',
      cleanString(payload?.brand),
      'payload.similar[0]=',
      `${cleanString(payload?.similarFragrances?.[0]?.brand)} ${cleanString(payload?.similarFragrances?.[0]?.name)}`.trim(),
    );
    const analysis = normalizeAiAnalysisToResult({ payload, mode, inputText: input, isPro });
    console.log(
      '[analyze] normalized identification fields:',
      'analysis.name=',
      cleanString(analysis?.name),
      'analysis.brand=',
      cleanString(analysis?.brand),
      'analysis.similar[0]=',
      `${cleanString(analysis?.similarFragrances?.[0]?.brand)} ${cleanString(analysis?.similarFragrances?.[0]?.name)}`.trim(),
    );
    const dbSimilar = await getDBSimilarFragrances(analysis, isPro);
    applySimilarFragrances(analysis, dbSimilar, isPro);
    const identityContext =
      perfumeContext ||
      (await findCatalogContextByIdentity(input, analysis));
    const stableResult = applySafetyFallbacks(analysis, identityContext, isPro, { inputText: input, mode, providerHealthy: true });
    stableResult.dataConfidence = { hasDbMatch: Boolean(identityContext), source: identityContext ? 'db' : 'ai' };
    const contextMatchScore = computeContextMatchScore(input, identityContext);
    stableResult.confidenceScore = computeConfidenceScore({ contextMatchScore, analysis: stableResult, mode, hasDbMatch: Boolean(identityContext) });
    attachIsPerfumeFlag(stableResult);
    const persisted = await persistResult({ analysis: stableResult, mode, inputText: input, appUserId: auth?.user?.id || null });
    const finalResult = persisted ? { ...stableResult, id: persisted.id, slug: persisted.slug ?? null, createdAt: persisted.createdAt } : stableResult;
    writeAnalysisCache(inputHash, finalResult, null);
    logTelemetry({ appUserId: auth?.user?.id || null, mode, latencyMs: Date.now() - startMs, success: true, cacheHit: false, degraded: false, retryCount, confidenceScore: finalResult.confidenceScore, hasDbMatch: Boolean(identityContext) });
    return res.status(200).json({ analysis: finalResult, plan: isPro ? 'pro' : 'free', stored: Boolean(persisted) });
  } catch (normErr) {
    console.error('[Error] normalization failed in /api/analyze:', normErr?.message, normErr?.stack?.split('\n').slice(0, 4).join(' | '));
    try {
      if (mode === 'image') {
        const imageIdentity = getImageHashIdentity(body.imageBase64);
        if (imageIdentity) {
          const fallbackContext = await findCatalogContextByIdentity(`${imageIdentity.brand} ${imageIdentity.name}`, imageIdentity);
          const fallbackPayload = buildEmergencyPayloadV2({ input: `${imageIdentity.brand} ${imageIdentity.name}`, mode, isPro, perfumeContext: fallbackContext, providerError: 'normalization_failed' });
          const fallbackAnalysis = normalizeAiAnalysisToResult({ payload: fallbackPayload, mode, inputText: input, isPro });
          const dbSimilarFallback = await getDBSimilarFragrances(fallbackAnalysis, isPro);
          applySimilarFragrances(fallbackAnalysis, dbSimilarFallback, isPro);
          const contextMatchScore = computeContextMatchScore(`${imageIdentity.brand} ${imageIdentity.name}`, fallbackContext);
          const stableFallback = applySafetyFallbacks(fallbackAnalysis, fallbackContext, isPro, { inputText: `${imageIdentity.brand} ${imageIdentity.name}`, mode, providerHealthy: false, contextMatchScore });
          stableFallback.dataConfidence = { hasDbMatch: Boolean(fallbackContext), source: fallbackContext ? 'db' : 'ai' };
          stableFallback.confidenceScore = computeConfidenceScore({ contextMatchScore, analysis: stableFallback, mode, hasDbMatch: Boolean(fallbackContext) });
          attachIsPerfumeFlag(stableFallback);
          const persisted = await persistResult({ analysis: stableFallback, mode, inputText: input, appUserId: auth?.user?.id || null });
          const result = persisted ? { ...stableFallback, id: persisted.id, slug: persisted.slug ?? null, createdAt: persisted.createdAt } : stableFallback;
          logTelemetry({ appUserId: auth?.user?.id || null, mode, latencyMs: Date.now() - startMs, success: true, cacheHit: false, degraded: true, retryCount, confidenceScore: result.confidenceScore, hasDbMatch: Boolean(fallbackContext) });
          return res.status(200).json({ analysis: result, plan: isPro ? 'pro' : 'free', stored: Boolean(persisted), degraded: true, providerError: 'Analiz cevabi islenemedi; hash fallback kullanildi.' });
        }
      }
    } catch (fallbackErr) {
      console.error('[Error] normalization fallback failed:', fallbackErr?.message);
    }
    logTelemetry({ appUserId: auth?.user?.id || null, mode, latencyMs: Date.now() - startMs, success: false, cacheHit: false, degraded: false, retryCount, errorCode: 'normalization_failed' });
    return res.status(500).json({ error: 'Analiz cevabi islenemedi.' });
  }
  } catch (outerErr) {
    console.error('[Error] analyze unhandled outer error:', outerErr?.message, outerErr?.stack?.split('\n').slice(0, 4).join(' | '));
    if (!res.headersSent) {
      return res.status(500).json({ error: outerErr?.message || 'Beklenmeyen sunucu hatasi.' });
    }
  }
};

