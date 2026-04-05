import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis/cloudflare';

let redisClient: Redis | null = null;
const INTERNAL_AUTH_HEADER = 'x-kd-internal-auth-check';
const AUTH_ONLY_ROUTES = new Set(['/dolap', '/wear', '/gecmis']);
const PRO_ONLY_ROUTES = new Map<string, string>([
  ['/karsilastir', 'Karşılaştır'],
  ['/layering', 'Katmanlama Lab'],
  ['/notalar', 'Nota Avcısı'],
]);

function resolveRedisEnv(): { url: string; token: string } {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';

  if (!url || !token) {
    throw new Error('Redis REST env must be set (UPSTASH_REDIS_REST_* or KV_REST_API_*)');
  }

  return { url, token };
}

function getRedisClient(): Redis {
  if (redisClient) return redisClient;
  const { url, token } = resolveRedisEnv();
  redisClient = new Redis({ url, token });
  return redisClient;
}

/**
 * Timing-safe string comparison.
 * Simple === checks are vulnerable to timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    let _diff = 0;
    for (let i = 0; i < a.length; i += 1) _diff |= a.charCodeAt(i) ^ 0;
    return false;
  }

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function isRateLimited(key: string, max: number, windowMs: number): Promise<boolean> {
  const redis = getRedisClient();
  const counter = await redis.incr(key);
  if (counter === 1) {
    await redis.expire(key, Math.ceil(windowMs / 1000));
  }
  return counter > max;
}

function getRedirectTarget(req: NextRequest): string {
  return `${req.nextUrl.pathname}${req.nextUrl.search}`;
}

function redirectToProfile(req: NextRequest): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = '/profil';
  url.searchParams.set('redirect', getRedirectTarget(req));
  return NextResponse.redirect(url);
}

function redirectToPlans(req: NextRequest, featureName: string): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = '/paketler';
  url.searchParams.set('feature', featureName);
  url.searchParams.set('redirect', getRedirectTarget(req));
  return NextResponse.redirect(url);
}

interface AuthUserPayload {
  id: string;
  email: string;
  name: string;
  isPro?: boolean;
  proActivatedAt?: string | null;
}

async function fetchAuthUser(req: NextRequest): Promise<AuthUserPayload | null> {
  const cookie = req.headers.get('cookie') || '';
  if (!cookie.includes('kd_token=')) return null;

  try {
    const response = await fetch(new URL('/api/auth', req.url), {
      method: 'GET',
      headers: {
        cookie,
        [INTERNAL_AUTH_HEADER]: '1',
        accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;
    const payload = (await response.json().catch(() => null)) as { user?: AuthUserPayload } | null;
    return payload?.user ?? null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const opsPassword = process.env.OPS_PASSWORD;

  if (req.headers.get(INTERNAL_AUTH_HEADER) === '1') {
    return NextResponse.next();
  }

  if (!opsPassword) {
    throw new Error('OPS_PASSWORD env must be set');
  }

  if (pathname === '/ops.html' || pathname.startsWith('/ops')) {
    const auth = req.headers.get('authorization') ?? '';
    const expected =
      'Basic ' +
      btoa(`${process.env.OPS_USER ?? 'admin'}:${opsPassword}`);

    if (!timingSafeEqual(auth, expected)) {
      return new NextResponse('Bu alana erisim kisitlidir.', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Ops"',
          'Cache-Control': 'no-store, no-cache',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
  }

  const isApiRoute =
    pathname.startsWith('/api/analyze') ||
    pathname.startsWith('/api/proxy') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/billing') ||
    pathname.startsWith('/api/wardrobe') ||
    pathname.startsWith('/api/feed') ||
    pathname.startsWith('/api/labs') ||
    pathname.startsWith('/api/perfume') ||
    pathname.startsWith('/api/barcode') ||
    pathname.startsWith('/api/layering');

  if (AUTH_ONLY_ROUTES.has(pathname) || PRO_ONLY_ROUTES.has(pathname)) {
    const user = await fetchAuthUser(req);
    if (!user) return redirectToProfile(req);

    if (PRO_ONLY_ROUTES.has(pathname) && !user.isPro) {
      return redirectToPlans(req, PRO_ONLY_ROUTES.get(pathname) || 'Pro Özellik');
    }
  }

  if (isApiRoute) {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'unknown';

    const endpoint = pathname.split('/')[2] || 'api';
    if (await isRateLimited(`rl:${ip}:${endpoint}`, 30, 60_000)) {
      return new NextResponse(
        JSON.stringify({
          error: 'Cok fazla istek gonderdiniz. Lutfen 1 dakika bekleyin.',
          retryAfter: 60,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Retry-After': '60',
            'Cache-Control': 'no-store',
          },
        },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dolap',
    '/wear',
    '/gecmis',
    '/karsilastir',
    '/layering',
    '/notalar',
    '/ops.html',
    '/ops/:path*',
    '/api/analyze/:path*',
    '/api/proxy',
    '/api/auth',
    '/api/billing/:path*',
    '/api/wardrobe',
    '/api/feed',
    '/api/labs/:path*',
    '/api/perfume/:path*',
    '/api/barcode/:path*',
    '/api/layering/:path*',
  ],
};
