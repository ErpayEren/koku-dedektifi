'use strict';

const { callAIProvider } = require('../../lib/server/provider-router');
const { buildPerfumeAnalysisSystemPrompt } = require('../../lib/server/perfume-analysis-prompt');
const { buildAnalysisResponseSchema, extractJsonObject } = require('../../lib/server/core-analysis.cjs');
const { validateLLMOutput, formatZodError } = require('../schemas/analysis');

function normalizeImageInput(imageBase64) {
  const trimmed = String(imageBase64 ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:image/')) return trimmed;
  return `data:image/jpeg;base64,${trimmed}`;
}

function buildMessages({ mode, input, imageBase64 }) {
  if (mode === 'image') {
    return [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Bu gorseli parfum uzmani gibi analiz et. Eger etiket gorunuyorsa urunu tani; gorunmuyorsa gorselin koku karakterine gore en savunulabilir profili uret. Kullanici notu: ${input || 'Gorsel analizi'}`,
          },
          {
            type: 'image_url',
            image_url: { url: normalizeImageInput(imageBase64 ?? '') },
          },
        ],
      },
    ];
  }

  const prefix =
    mode === 'notes'
      ? 'Asagidaki nota listesine gore analiz yap:'
      : 'Asagidaki parfum/koku girdisini analiz et:';
  return [{ role: 'user', content: `${prefix}\n${input}` }];
}

/**
 * Calls the LLM with optional one-time retry on Zod validation failure.
 * @returns {{ providerResponse, retryCount }}
 */
async function callWithRetry({ mode, input, imageBase64, isPro, perfumeContext }) {
  const systemPrompt = buildPerfumeAnalysisSystemPrompt({ isPro, perfumeContext });
  const messages = buildMessages({ mode, input, imageBase64 });

  let providerResponse = await callAIProvider(messages, 'analysis', {
    systemPrompt,
    hasImage: mode === 'image',
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
        hasImage: mode === 'image',
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

module.exports = { callWithRetry, buildMessages };
