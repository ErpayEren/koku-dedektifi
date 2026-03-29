import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/ops') || pathname === '/ops.html') {
    const auth = req.headers.get('authorization') ?? '';
    const expected =
      'Basic ' +
      Buffer.from(`${process.env.OPS_USER ?? 'admin'}:${process.env.OPS_PASSWORD ?? 'changeme'}`).toString('base64');

    if (auth !== expected) {
      return new NextResponse('Bu alana erişim kısıtlıdır.', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Ops"' },
      });
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ['/ops', '/ops/:path*', '/ops.html'] };
