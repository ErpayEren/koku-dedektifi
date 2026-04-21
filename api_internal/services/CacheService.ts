import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

/* eslint-disable @typescript-eslint/no-require-imports */
const { resolveSupabaseConfig } = require('../../lib/server/supabase-config') as {
  resolveSupabaseConfig: () => { url: string; serviceRoleKey: string };
};

const PROMPT_VERSION = 'v3';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function computeInputHash(
  mode: string,
  input: string | undefined,
  imageBase64?: string,
): string {
  const raw =
    mode === 'image'
      ? `image::${String(imageBase64 ?? '').slice(0, 256)}`
      : `${mode}::${String(input ?? '').toLowerCase().trim()}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function readAnalysisCache(
  inputHash: string,
): Promise<Record<string, unknown> | null> {
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
    return (data as { result_json?: Record<string, unknown> } | null)?.result_json ?? null;
  } catch {
    return null;
  }
}

export async function writeAnalysisCache(
  inputHash: string,
  resultJson: unknown,
  modelVersion?: string | null,
): Promise<void> {
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
