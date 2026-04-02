import { normalizeAnalysisPayload } from './analysis';
import type { AnalysisResult, FinderCandidate } from './types';

export interface ApiErrorPayload {
  error?: string;
  limit?: number;
  retryAfter?: string;
  upgrade?: string;
  plan?: 'free' | 'pro';
  [key: string]: unknown;
}

export class ApiError extends Error {
  status: number;
  payload: ApiErrorPayload;

  constructor(message: string, status: number, payload: ApiErrorPayload = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'İşlem sırasında beklenmeyen bir hata oluştu.';
}

async function jsonRequest<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
  });
  const data = (await response.json().catch(() => ({}))) as ApiErrorPayload;

  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : `İstek başarısız (${response.status})`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export async function analyzeText(text: string): Promise<AnalysisResult> {
  const payload = {
    promptType: 'analysis',
    messages: [{ role: 'user', content: text.trim() }],
  };

  const data = await jsonRequest<unknown>('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return normalizeAnalysisPayload(data);
}

export async function analyzeNotes(notesText: string): Promise<AnalysisResult> {
  const prompt = `Aşağıdaki nota listesine göre analiz yap: ${notesText.trim()}`;
  const payload = {
    promptType: 'analysis',
    messages: [{ role: 'user', content: prompt }],
  };

  const data = await jsonRequest<unknown>('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return normalizeAnalysisPayload(data);
}

export async function analyzeImage(dataUrl: string): Promise<AnalysisResult> {
  const payload = {
    promptType: 'analysis',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Bu görseldeki kokuyu analiz et.' },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
  };

  const data = await jsonRequest<unknown>('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return normalizeAnalysisPayload(data);
}

export async function runFinder(input: {
  includeNotes: string[];
  excludeNotes: string[];
  maxSweetness: number;
  targetSweetness: number;
  limit?: number;
}): Promise<FinderCandidate[]> {
  const data = await jsonRequest<{ candidates?: FinderCandidate[] }>('/api/labs?r=perfume-finder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      includeNotes: input.includeNotes,
      excludeNotes: input.excludeNotes,
      maxSweetness: input.maxSweetness,
      targetSweetness: input.targetSweetness,
      limit: input.limit ?? 10,
    }),
  });

  const candidates = Array.isArray(data.candidates) ? data.candidates : [];

  return candidates
    .map((item) => {
      const sweetness = Number(item.sweetness);
      const baseScore = Number(item.score);
      const includeBonus = (item.includeMatches?.length || 0) * 2;
      const targetDelta = Number.isFinite(sweetness) ? Math.abs(sweetness - input.targetSweetness) * 0.45 : 0;
      const maxPenalty =
        Number.isFinite(sweetness) && sweetness > input.maxSweetness ? (sweetness - input.maxSweetness) * 1.2 : 0;
      const adjustedScore = Math.max(0, Math.min(100, Math.round(baseScore + includeBonus - targetDelta - maxPenalty)));

      return {
        ...item,
        score: adjustedScore,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export async function runLayering(input: {
  left: string;
  right: string;
}): Promise<{ result: AnalysisResult; compatibility: number; sharedNotes: string[] }> {
  const data = await jsonRequest<{
    result?: unknown;
    blend?: { compatibility?: number; sharedNotes?: string[] };
  }>('/api/labs?r=layering-lab', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ left: input.left, right: input.right }),
  });

  if (!data.result) {
    throw new Error('Katmanlama sonucu üretilemedi.');
  }

  return {
    result: normalizeAnalysisPayload({
      content: [{ type: 'text', text: JSON.stringify(data.result) }],
    }),
    compatibility: Number.isFinite(Number(data.blend?.compatibility)) ? Number(data.blend?.compatibility) : 0,
    sharedNotes: Array.isArray(data.blend?.sharedNotes) ? data.blend?.sharedNotes : [],
  };
}

export async function lookupBarcode(code: string): Promise<{
  found: boolean;
  perfume: string;
  family: string;
  occasion: string;
  season: string[];
  message: string;
}> {
  const data = await jsonRequest<{
    found?: boolean;
    perfume?: string;
    family?: string;
    occasion?: string;
    season?: string[];
    message?: string;
  }>('/api/labs?r=barcode-lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  return {
    found: data.found === true,
    perfume: typeof data.perfume === 'string' ? data.perfume : '',
    family: typeof data.family === 'string' ? data.family : '',
    occasion: typeof data.occasion === 'string' ? data.occasion : '',
    season: Array.isArray(data.season) ? data.season : [],
    message: typeof data.message === 'string' ? data.message : '',
  };
}

export async function authAction<T>(body: unknown, method: 'GET' | 'POST' | 'PATCH' = 'POST'): Promise<T> {
  const headers: Record<string, string> = {};
  if (method !== 'GET') headers['Content-Type'] = 'application/json';

  return jsonRequest<T>('/api/auth', {
    method,
    headers,
    body: method === 'GET' ? undefined : JSON.stringify(body),
  });
}

export function readableError(error: unknown): string {
  return toErrorMessage(error);
}
