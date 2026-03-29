import { NextRequest, NextResponse } from 'next/server';

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

/**
 * In-memory rate limiter fallback.
 * If Redis is available, prefer Redis-based limiting.
 */
const rl = new Map<string, { n: number; t: number }>();

function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rl.get(key);

  if (!entry || entry.t < now) {
    rl.set(key, { n: 1, t: now + windowMs });
    return false;
  }
  if (entry.n >= max) return true;
  entry.n += 1;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/ops')) {
    const auth = req.headers.get('authorization') ?? '';
    const expected =
      'Basic ' +
      Buffer.from(
        `${process.env.OPS_USER ?? 'admin'}:${process.env.OPS_PASSWORD ?? 'changeme'}`,
      ).toString('base64');

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
    pathname.startsWith('/api/labs') ||
    pathname.startsWith('/api/perfume') ||
    pathname.startsWith('/api/barcode') ||
    pathname.startsWith('/api/layering');

  if (isApiRoute) {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'unknown';

    if (isRateLimited(`${ip}:${pathname.split('/')[2]}`, 30, 60_000)) {
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
    '/ops/:path*',
    '/api/analyze/:path*',
    '/api/labs/:path*',
    '/api/perfume/:path*',
    '/api/barcode/:path*',
    '/api/layering/:path*',
  ],
};

