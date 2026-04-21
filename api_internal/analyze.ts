/**
 * analyze.ts — Analysis orchestrator (TypeScript source).
 * The CJS runtime entry point is analyze.js which imports from this module's services.
 * See api_internal/services/ for the individual service implementations.
 */

// Re-export service types for external consumers
export type { AnalysisResult, PerfumeContext, Molecule, SimilarFragrance, ScoreCards } from './services/ResultNormalizer';
export type { TelemetryParams } from './services/TelemetryService';
export type { QuotaError } from './services/QuotaService';
export type { LLMRouterOptions, LLMRouterResult } from './services/LLMRouter';
export type { PersistParams, PersistedRecord } from './services/PersistenceService';

export { computeInputHash, readAnalysisCache, writeAnalysisCache } from './services/CacheService';
export { logTelemetry } from './services/TelemetryService';
export { enforceQuota } from './services/QuotaService';
export { callWithRetry } from './services/LLMRouter';
export {
  computeConfidenceScore,
  computeContextMatchScore,
  applySafetyFallbacks,
  buildEmergencyPayloadV2,
  getDBSimilarFragrances,
  applySimilarFragrances,
} from './services/ResultNormalizer';
export { persistResult } from './services/PersistenceService';
