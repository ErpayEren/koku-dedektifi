import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildProxyHeaders(request: NextRequest): HeadersInit {
  const headers: Record<string, string> = {
    'content-type': request.headers.get('content-type') || 'application/json',
  };

  const cookie = request.headers.get('cookie');
  if (cookie) headers.cookie = cookie;

  const authorization = request.headers.get('authorization');
  if (authorization) headers.authorization = authorization;

  return headers;
}

async function proxyAnalyze(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const body = await request.text();
  const response = await fetch(`${origin}/api/ops?r=analyze`, {
    method: 'POST',
    headers: buildProxyHeaders(request),
    body,
    cache: 'no-store',
  });

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') || 'application/json; charset=utf-8',
    },
  });
}

export async function POST(request: NextRequest) {
  return proxyAnalyze(request);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      Allow: 'POST, OPTIONS',
    },
  });
}
