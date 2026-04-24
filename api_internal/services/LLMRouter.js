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

function tryExtractAndValidate(formatted) {
  try {
    const rawParsed = extractJsonObject(formatted);
    const zodResult = validateLLMOutput(rawParsed);
    if (!zodResult.success) {
      return { ok: false, reason: formatZodError(zodResult.error) };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'invalid_json',
    };
  }
}

function extractFormattedText(formatted) {
  if (!formatted) return '';
  if (typeof formatted === 'string') return formatted;
  if (Array.isArray(formatted?.content)) {
    return formatted.content
      .map((part) => (part && typeof part.text === 'string' ? part.text : ''))
      .join('\n')
      .trim();
  }
  return '';
}

/**
 * Calls the LLM with optional one-time retry on malformed JSON or schema failure.
 * @returns {{ providerResponse, retryCount }}
 */
async function callWithRetry({ mode, input, imageBase64, isPro, perfumeContext }) {
  const systemPrompt = buildPerfumeAnalysisSystemPrompt({ isPro, perfumeContext });
  const messages = buildMessages({ mode, input, imageBase64 });

  if (mode === 'image') {
    const normalized = normalizeImageInput(imageBase64 ?? '');
    console.log('[Gemini] imageBase64 preview (first 100):', normalized.slice(0, 100));
  }

  let providerResponse = await callAIProvider(messages, 'analysis', {
    systemPrompt,
    hasImage: mode === 'image',
    useWebSearch: false,
    responseJsonSchema: buildAnalysisResponseSchema(),
  });

  let retryCount = 0;

  if (providerResponse.ok && providerResponse.formatted) {
    const firstRaw = extractFormattedText(providerResponse.formatted);
    console.log('[Gemini] raw response before parse:', firstRaw.slice(0, 1200));

    const validation = tryExtractAndValidate(providerResponse.formatted);
    if (!validation.ok) {
      console.error('[Error] initial Zod/JSON validation failed:', validation.reason);
      retryCount = 1;

      const correctionPrompt = `${systemPrompt}\n\nONCEKI YANIT GECERSIZDI. Sadece ve yalnizca semaya tam uyan JSON dondur. Sorun: ${validation.reason}`;
      const retryResponse = await callAIProvider(messages, 'analysis', {
        systemPrompt: correctionPrompt,
        hasImage: mode === 'image',
        useWebSearch: false,
        responseJsonSchema: buildAnalysisResponseSchema(),
      });

      if (retryResponse.ok && retryResponse.formatted) {
        const retryRaw = extractFormattedText(retryResponse.formatted);
        console.log('[Gemini] retry raw response before parse:', retryRaw.slice(0, 1200));

        const retryValidation = tryExtractAndValidate(retryResponse.formatted);
        if (retryValidation.ok) {
          providerResponse = retryResponse;
        } else {
          // Keep a valid provider payload path for normalizer instead of forcing emergency fallback.
          console.error('[Error] retry Zod/JSON validation failed:', retryValidation.reason, '- using response anyway');
          providerResponse = retryResponse;
        }
      } else {
        console.error('[Error] retry provider call failed:', retryResponse?.error || 'unknown_provider_error');
        providerResponse = retryResponse;
      }
    }
  } else {
    console.error('[Error] providerResponse not ok or missing formatted payload:', providerResponse?.error || 'unknown_error');
  }

  return { providerResponse, retryCount };
}

module.exports = { callWithRetry, buildMessages };
