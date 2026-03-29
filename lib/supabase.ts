import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  '';

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_KEY ??
  '';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Supabase] URL veya KEY eksik - wardrobe/feed devre disi');
    }
    return null;
  }

  if (!_client) {
    _client = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  }
  return _client;
}

export async function safeQuery<T>(
  fn: (client: SupabaseClient) => Promise<{ data: T | null; error: unknown }>,
): Promise<T | null> {
  const client = getSupabase();
  if (!client) return null;

  const { data, error } = await fn(client);
  if (error) {
    console.error('[Supabase] query error:', error);
    return null;
  }
  return data;
}

