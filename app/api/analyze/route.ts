import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type NodeLikeRequest = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
  query: Record<string, string | string[]>;
  socket: { remoteAddress: string };
};

type HeaderValue = string | number | string[] | undefined;

class ResponseCapture {
  statusCode = 200;
  headersSent = false;
  private readonly headerMap = new Map<string, string>();
  private body = '';

  setHeader(name: string, value: HeaderValue) {
    if (typeof value === 'undefined') return this;
    const normalized = Array.isArray(value) ? value.join(', ') : String(value);
    this.headerMap.set(name.toLowerCase(), normalized);
    return this;
  }

  getHeader(name: string) {
    return this.headerMap.get(name.toLowerCase());
  }

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(payload: unknown) {
    if (!this.getHeader('content-type')) {
      this.setHeader('content-type', 'application/json; charset=utf-8');
    }
    this.body = JSON.stringify(payload);
    this.headersSent = true;
    return this;
  }

  end(payload?: string | null) {
    this.body = payload ? String(payload) : '';
    this.headersSent = true;
    return this;
  }

  toNextResponse() {
    const headers = new Headers();
    for (const [key, value] of this.headerMap.entries()) {
      headers.set(key, value);
    }
    return new NextResponse(this.body, {
      status: this.statusCode,
      headers,
    });
  }
}

function buildNodeLikeRequest(request: NextRequest, body: string): NodeLikeRequest {
  const headers = Object.fromEntries(
    Array.from(request.headers.entries()).map(([key, value]) => [key.toLowerCase(), value]),
  );

  const query: Record<string, string | string[]> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    const existing = query[key];
    if (typeof existing === 'undefined') {
      query[key] = value;
      return;
    }
    query[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
  });

  return {
    method: request.method,
    url: request.url,
    headers,
    body,
    query,
    socket: {
      remoteAddress:
        headers['x-real-ip'] ||
        headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        '0.0.0.0',
    },
  };
}

async function runAnalyzeHandler(request: NextRequest) {
  const body = await request.text();
  const nodeReq = buildNodeLikeRequest(request, body);
  const nodeRes = new ResponseCapture();

  try {
    // @ts-expect-error Legacy CommonJS handler does not expose TypeScript declarations.
    const mod = await import('../../../api_internal/analyze.js');
    const analyzeHandler: (req: NodeLikeRequest, res: ResponseCapture) => Promise<unknown> =
      (mod.default || mod) as never;

    await analyzeHandler(nodeReq, nodeRes);
    return nodeRes.toNextResponse();
  } catch (error) {
    console.error('[app/api/analyze] failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Beklenmeyen sunucu hatasi.',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return runAnalyzeHandler(request);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      Allow: 'POST, OPTIONS',
    },
  });
}
