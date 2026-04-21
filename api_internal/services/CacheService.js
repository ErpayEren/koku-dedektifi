'use strict';

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { resolveSupabaseConfig } = require('../../lib/server/supabase-config');

const PROMPT_VERSION = 'v3';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function computeInputHash(mode, input, imageBase64) {
  const raw =
    mode === 'image'
      ? `image::${String(imageBase64 ?? '').slice(0, 256)}`
      : `${mode}::${String(input ?? '').toLowerCase().trim()}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function readAnalysisCache(inputHash) {
  const config = resolveSupabaseConfig();
  if (!config.url || !config.serviceRoleKey) return null;
  try {
    const client = createClient(config.url, config.serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { data } = await client
      .from('analysis_cache')
      .select('result_json')
      .eq('input_hash', inputHash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    return data?.result_json ?? null;
  } catch {
    return null;
  }
}

async function writeAnalysisCache(inputHash, resultJson, modelVersion) {
  const config = resolveSupabaseConfig();
  if (!config.url || !config.serviceRoleKey) return;
  try {
    const client = createClient(config.url, config.serviceRoleKey, {
      auth: { persistSession: false },
    });
    await client.from('analysis_cache').upsert(
      {
        input_hash: inputHash,
        result_json: resultJson,
        model_version: modelVersion ?? null,
        prompt_version: PROMPT_VERSION,
        cached_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
      },
      { onConflict: 'input_hash' },
    );
  } catch {
    // non-critical
  }
}

module.exports = { computeInputHash, readAnalysisCache, writeAnalysisCache };
