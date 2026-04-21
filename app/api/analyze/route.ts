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

  let response: Response;
  try {
    response = await fetch(`${origin}/api/ops?r=analyze`, {
      method: 'POST',
      headers: buildProxyHeaders(request),
      body,
      cache: 'no-store',
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Analiz servisi şu an yanıt vermiyor, lütfen tekrar deneyin.' },
      { status: 503 },
    );
  }

  const text = await response.text();

  // If the upstream returned HTML (e.g. unhandled crash), wrap it as JSON
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok && !contentType.includes('application/json')) {
    return NextResponse.json(
      { error: `Analiz servisi hatası (${response.status}), lütfen tekrar deneyin.` },
      { status: response.status >= 500 ? 503 : response.status },
    );
  }

  return new NextResponse(text, {
    status: response.status,
    headers: {
      'content-type': contentType || 'application/json; charset=utf-8',
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
