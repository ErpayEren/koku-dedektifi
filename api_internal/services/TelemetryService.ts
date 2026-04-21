import { createClient } from '@supabase/supabase-js';

/* eslint-disable @typescript-eslint/no-require-imports */
const { resolveSupabaseConfig } = require('../../lib/server/supabase-config') as {
  resolveSupabaseConfig: () => { url: string; serviceRoleKey: string };
};

const PROMPT_VERSION = 'v3';

export interface TelemetryParams {
  appUserId?: string | null;
  mode: string;
  latencyMs?: number | null;
  success: boolean;
  cacheHit?: boolean;
  degraded?: boolean;
  retryCount?: number;
  confidenceScore?: number | null;
  hasDbMatch?: boolean;
  errorCode?: string | null;
  modelVersion?: string | null;
}

export function logTelemetry(params: TelemetryParams): void {
  const config = resolveSupabaseConfig();
  if (!config.url || !config.serviceRoleKey) return;

  const {
    appUserId,
    mode,
    latencyMs,
    success,
    cacheHit,
    degraded,
    retryCount,
    confidenceScore,
    hasDbMatch,
    errorCode,
    modelVersion,
  } = params;

  const client = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false },
  });

  void (async () => {
    try {
      await client.from('analysis_telemetry').insert({
        app_user_id: appUserId ?? null,
        mode: mode ?? 'text',
        prompt_version: PROMPT_VERSION,
        model_version: modelVersion ?? null,
        latency_ms: latencyMs ?? null,
        success: Boolean(success),
        cache_hit: Boolean(cacheHit),
        degraded: Boolean(degraded),
        retry_count: retryCount ?? 0,
        confidence_score: confidenceScore != null ? Math.round(confidenceScore) : null,
        has_db_match: Boolean(hasDbMatch),
        error_code: errorCode ?? null,
      });
    } catch {
      // Telemetry failures should never block the user flow.
    }
  })();
}
