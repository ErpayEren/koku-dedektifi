/* eslint-disable @typescript-eslint/no-require-imports */
const { callAIProvider } = require('../../lib/server/provider-router') as {
  callAIProvider: (
    messages: unknown[],
    type: string,
    options: Record<string, unknown>,
  ) => Promise<{ ok: boolean; formatted?: string; error?: string; status?: number }>;
};
const { buildPerfumeAnalysisSystemPrompt } = require('../../lib/server/perfume-analysis-prompt') as {
  buildPerfumeAnalysisSystemPrompt: (opts: {
    isPro: boolean;
    perfumeContext: unknown;
  }) => string;
};
const { buildAnalysisResponseSchema, extractJsonObject } = require('../../lib/server/core-analysis.cjs') as {
  buildAnalysisResponseSchema: () => unknown;
  extractJsonObject: (text: string) => unknown;
};
const { validateLLMOutput, formatZodError } = require('../schemas/analysis') as {
  validateLLMOutput: (data: unknown) => { success: boolean; data?: unknown; error?: { issues?: unknown[] } };
  formatZodError: (err: unknown) => string;
};

export interface LLMRouterOptions {
  mode: string;
  input: string;
  imageBase64?: string;
  isPro: boolean;
  perfumeContext: unknown;
}

export interface LLMRouterResult {
  providerResponse: { ok: boolean; formatted?: string; error?: string; status?: number };
  retryCount: number;
}

function normalizeImageInput(imageBase64: string): string {
  const trimmed = imageBase64.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:image/')) return trimmed;
  return `data:image/jpeg;base64,${trimmed}`;
}

function buildMessages(opts: {
  mode: string;
  input: string;
  imageBase64?: string;
}): unknown[] {
  if (opts.mode === 'image') {
    return [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Bu gorseli parfum uzmani gibi analiz et. Eger etiket gorunuyorsa urunu tani; gorunmuyorsa gorselin koku karakterine gore en savunulabilir profili uret. Kullanici notu: ${opts.input || 'Gorsel analizi'}`,
          },
          {
            type: 'image_url',
            image_url: { url: normalizeImageInput(opts.imageBase64 ?? '') },
          },
        ],
      },
    ];
  }

  const prefix =
    opts.mode === 'notes'
      ? 'Asagidaki nota listesine gore analiz yap:'
      : 'Asagidaki parfum/koku girdisini analiz et:';
  return [{ role: 'user', content: `${prefix}\n${opts.input}` }];
}

export async function callWithRetry(opts: LLMRouterOptions): Promise<LLMRouterResult> {
  const systemPrompt = buildPerfumeAnalysisSystemPrompt({
    isPro: opts.isPro,
    perfumeContext: opts.perfumeContext,
  });

  const messages = buildMessages({
    mode: opts.mode,
    input: opts.input,
    imageBase64: opts.imageBase64,
  });

  let providerResponse = await callAIProvider(messages, 'analysis', {
    systemPrompt,
    hasImage: opts.mode === 'image',
    useWebSearch: false,
    responseJsonSchema: buildAnalysisResponseSchema(),
  });

  let retryCount = 0;

  if (providerResponse.ok && providerResponse.formatted) {
    const rawParsed = extractJsonObject(providerResponse.formatted);
    const zodResult = validateLLMOutput(rawParsed);
    if (!zodResult.success) {
      retryCount = 1;
      const correctionPrompt = `${systemPrompt}\n\nÖNCEKİ YANIT GEÇERSİZDİ. Sadece ve yalnızca şemaya tam uyan JSON döndür. Eksik alanlar: ${formatZodError(zodResult.error)}`;
      const retryResponse = await callAIProvider(messages, 'analysis', {
        systemPrompt: correctionPrompt,
        hasImage: opts.mode === 'image',
        useWebSearch: false,
        responseJsonSchema: buildAnalysisResponseSchema(),
      });
      if (retryResponse.ok && retryResponse.formatted) {
        providerResponse = retryResponse;
      }
    }
  }

  return { providerResponse, retryCount };
}
