'use strict';

const { createClient } = require('@supabase/supabase-js');
const { resolveSupabaseConfig } = require('../../lib/server/supabase-config');

const PROMPT_VERSION = 'v3';

function logTelemetry(params) {
  const config = resolveSupabaseConfig();
  if (!config.url || !config.serviceRoleKey) return;

  const {
    appUserId, mode, latencyMs, success, cacheHit,
    degraded, retryCount, confidenceScore, hasDbMatch, errorCode, modelVersion,
  } = params;

  const client = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false },
  });

  client
    .from('analysis_telemetry')
    .insert({
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
    })
    .then(() => {})
    .catch(() => {});
}

module.exports = { logTelemetry };
