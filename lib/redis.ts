import { Redis } from '@upstash/redis';

function createRedis(): Redis | null {
  const url =
    process.env.KV_REST_API_URL ??
    process.env.UPSTASH_REDIS_REST_URL ??
    '';

  const token =
    process.env.KV_REST_API_TOKEN ??
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    '';

  if (!url || !token) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Redis] Credentials eksik - in-memory fallback aktif');
    }
    return null;
  }

  try {
    return new Redis({ url, token });
  } catch (e) {
    console.error('[Redis] Baglanti kurulamadi:', e);
    return null;
  }
}

export const redis = createRedis();

export async function checkRateLimit(
  key: string,
  max: number,
  windowSec: number,
): Promise<{ allowed: boolean; remaining: number }> {
  if (!redis) return { allowed: true, remaining: max };

  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSec);
  const remaining = Math.max(0, max - count);
  return { allowed: count <= max, remaining };
}

