'use strict';

// Orchestrator — delegates to api_internal/services/
// TypeScript source: analyze.ts (type re-exports + declarations)
// See docs/architecture.md for the full service diagram

const { cleanString, setCorsHeaders, setSecurityHeaders } = require('../lib/server/config');
const { readAuthSession } = require('../lib/server/auth-session');
const { readEntitlementForUser } = require('../lib/server/billing-store');
const { findPerfumeContextByInput } = require('../lib/server/perfume-analysis-prompt');
const { normalizeAiAnalysisToResult, extractJsonObject } = require('../lib/server/core-analysis.cjs');
const { validateAnalysisInput, formatZodError } = require('./schemas/analysis');
const { createClient } = require('@supabase/supabase-js');
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

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return null; } }
  return body && typeof body === 'object' ? body : null;
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
  const normalizeKey = (v) => String(v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const fragKey = (v) => String(v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
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
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res, { methods: 'POST, OPTIONS', headers: 'Content-Type' })) return res.status(403).json({ error: 'Bu origin icin erisim izni yok.' });
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await readAuthSession(req);
  const startMs = Date.now();

  const quotaError = await enforceQuota(req);
  if (quotaError) return res.status(quotaError.statusCode).json(quotaError.body);

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Gecersiz JSON govdesi.' });
  const inputValidation = validateAnalysisInput(body);
  if (!inputValidation.success) return res.status(400).json({ error: formatZodError(inputValidation.error) });
  const { mode } = body;
  if (!['text', 'notes', 'image'].includes(mode)) return res.status(400).json({ error: 'mode alani text, notes veya image olmali.' });
  const input = cleanString(body.input);
  if (!input && mode !== 'image') return res.status(400).json({ error: 'input alani gerekli.' });
  if (mode === 'image' && !cleanString(body.imageBase64)) return res.status(400).json({ error: 'imageBase64 alani gerekli.' });

  const inputHash = computeInputHash(mode, input, body.imageBase64);
  const cached = await readAnalysisCache(inputHash);
  if (cached && typeof cached === 'object') {
    const entitlement = auth?.user?.id ? await readEntitlementForUser(auth.user.id) : { tier: 'free' };
    logTelemetry({ appUserId: auth?.user?.id || null, mode, latencyMs: Date.now() - startMs, success: true, cacheHit: true, degraded: false, retryCount: 0, confidenceScore: cached.confidenceScore, hasDbMatch: cached.dataConfidence?.hasDbMatch || false });
    return res.status(200).json({ analysis: { ...cached, cached: true }, plan: entitlement?.tier === 'pro' ? 'pro' : 'free', stored: true, cached: true });
  }

  const entitlement = auth?.user?.id ? await readEntitlementForUser(auth.user.id) : { tier: 'free' };
  const isPro = entitlement?.tier === 'pro';
  const perfumeContext = await findPerfumeContextByInput(input, { allowVector: mode === 'text' || mode === 'notes', mode });
  const initialContextMatchScore = computeContextMatchScore(input, perfumeContext);
  const shouldUseDbFirstPath = mode === 'text' && Boolean(perfumeContext) && initialContextMatchScore >= 0.74;

  if (shouldUseDbFirstPath) {
    try {
      const dbPayload = buildEmergencyPayloadV2({ input, mode, isPro, perfumeContext, providerError: 'db_first' });
      const dbAnalysis = normalizeAiAnalysisToResult({ payload: dbPayload, mode, inputText: input, isPro });
      const dbSimilar = await getDBSimilarFragrances(dbAnalysis, isPro);
      applySimilarFragrances(dbAnalysis, dbSimilar, isPro);
      const stableDbResult = applySafetyFallbacks(dbAnalysis, perfumeContext, isPro, { inputText: input, mode, providerHealthy: true, contextMatchScore: initialContextMatchScore });
      stableDbResult.dataConfidence = { hasDbMatch: true, source: 'db' };
      stableDbResult.confidenceScore = computeConfidenceScore({ contextMatchScore: initialContextMatchScore, analysis: stableDbResult, mode, hasDbMatch: true });
      const persisted = await persistResult({ analysis: stableDbResult, mode, inputText: input, appUserId: auth?.user?.id || null });
      const finalDbResult = persisted ? { ...stableDbResult, id: persisted.id, slug: persisted.slug ?? null, createdAt: persisted.createdAt } : stableDbResult;
      writeAnalysisCache(inputHash, finalDbResult, null);
      logTelemetry({ appUserId: auth?.user?.id || null, mode, latencyMs: Date.now() - startMs, success: true, cacheHit: false, degraded: false, retryCount: 0, confidenceScore: finalDbResult.confidenceScore, hasDbMatch: true });
      return res.status(200).json({ analysis: finalDbResult, plan: isPro ? 'pro' : 'free', stored: Boolean(persisted), dbFirst: true });
    } catch { /* fall through to LLM path */ }
  }

  const { providerResponse, retryCount } = await callWithRetry({ mode, input, imageBase64: body.imageBase64, isPro, perfumeContext });

  if (!providerResponse.ok || !providerResponse.formatted) {
    try {
      let fallbackContext = perfumeContext;
      if (!fallbackContext && mode === 'text') fallbackContext = await findCatalogContextByIdentity(input, { name: input, brand: '', family: '' });
      const contextMatchScore = computeContextMatchScore(input, fallbackContext);
      const parsedNoteCount = (input || '').split(/[,;|/\n]/).filter((s) => cleanString(s)).length;
      const hasReliableBasis = Boolean(fallbackContext) || parsedNoteCount >= 2 || mode === 'image';
      if (!hasReliableBasis) {
        logTelemetry({ appUserId: auth?.user?.id || null, mode, latencyMs: Date.now() - startMs, success: false, cacheHit: false, degraded: true, retryCount, errorCode: 'no_fallback_basis' });
        return res.status(providerResponse.status || 503).json({ error: 'Saglayici su an yogun ve bu girdi icin guvenilir fallback olusturulamadi. Lutfen 20-30 saniye sonra tekrar dene.', providerError: providerResponse.error || 'provider_unavailable' });
      }
      const fallbackPayload = buildEmergencyPayloadV2({ input, mode, isPro, perfumeContext: fallbackContext, providerError: providerResponse.error });
      const fallbackAnalysis = normalizeAiAnalysisToResult({ payload: fallbackPayload, mode, inputText: input, isPro });
      const identityContext = fallbackContext || (await findCatalogContextByIdentity(input, fallbackAnalysis));
      const dbSimilarFallback = await getDBSimilarFragrances(fallbackAnalysis, isPro);
      applySimilarFragrances(fallbackAnalysis, dbSimilarFallback, isPro);
      const stableFallback = applySafetyFallbacks(fallbackAnalysis, identityContext, isPro, { inputText: input, mode, providerHealthy: false, contextMatchScore });
      stableFallback.dataConfidence = { hasDbMatch: Boolean(identityContext), source: identityContext ? 'db' : 'ai' };
      stableFallback.confidenceScore = computeConfidenceScore({ contextMatchScore, analysis: stableFallback, mode, hasDbMatch: Boolean(identityContext) });
      const persisted = await persistResult({ analysis: stableFallback, mode, inputText: input, appUserId: auth?.user?.id || null });
      const result = persisted ? { ...stableFallback, id: persisted.id, slug: persisted.slug ?? null, createdAt: persisted.createdAt } : stableFallback;
      logTelemetry({ appUserId: auth?.user?.id || null, mode, latencyMs: Date.now() - startMs, success: true, cacheHit: false, degraded: true, retryCount, confidenceScore: result.confidenceScore, hasDbMatch: Boolean(identityContext) });
      return res.status(200).json({ analysis: result, plan: isPro ? 'pro' : 'free', stored: Boolean(persisted), degraded: true, providerError: providerResponse.error || 'provider_unavailable' });
    } catch {
      logTelemetry({ appUserId: auth?.user?.id || null, mode, latencyMs: Date.now() - startMs, success: false, cacheHit: false, degraded: true, retryCount, errorCode: 'fallback_failed' });
      return res.status(providerResponse.status || 502).json({ error: providerResponse.error || 'Analiz olusturulamadi.' });
    }
  }

  try {
    const payload = extractJsonObject(providerResponse.formatted);
    const analysis = normalizeAiAnalysisToResult({ payload, mode, inputText: input, isPro });
    const identityContext = perfumeContext || (await findCatalogContextByIdentity(input, analysis));
    const dbSimilar = await getDBSimilarFragrances(analysis, isPro);
    applySimilarFragrances(analysis, dbSimilar, isPro);
    const stableResult = applySafetyFallbacks(analysis, identityContext, isPro, { inputText: input, mode, providerHealthy: true });
    stableResult.dataConfidence = { hasDbMatch: Boolean(identityContext), source: identityContext ? 'db' : 'ai' };
    const contextMatchScore = computeContextMatchScore(input, identityContext);
    stableResult.confidenceScore = computeConfidenceScore({ contextMatchScore, analysis: stableResult, mode, hasDbMatch: Boolean(identityContext) });
    const persisted = await persistResult({ analysis: stableResult, mode, inputText: input, appUserId: auth?.user?.id || null });
    const finalResult = persisted ? { ...stableResult, id: persisted.id, slug: persisted.slug ?? null, createdAt: persisted.createdAt } : stableResult;
    writeAnalysisCache(inputHash, finalResult, null);
    logTelemetry({ appUserId: auth?.user?.id || null, mode, latencyMs: Date.now() - startMs, success: true, cacheHit: false, degraded: false, retryCount, confidenceScore: finalResult.confidenceScore, hasDbMatch: Boolean(identityContext) });
    return res.status(200).json({ analysis: finalResult, plan: isPro ? 'pro' : 'free', stored: Boolean(persisted) });
  } catch {
    logTelemetry({ appUserId: auth?.user?.id || null, mode, latencyMs: Date.now() - startMs, success: false, cacheHit: false, degraded: false, retryCount, errorCode: 'normalization_failed' });
    return res.status(500).json({ error: 'Analiz cevabi islenemedi.' });
  }
};
