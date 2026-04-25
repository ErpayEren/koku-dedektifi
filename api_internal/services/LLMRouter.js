'use strict';

const { callAIProvider } = require('../../lib/server/provider-router');
const { buildPerfumeAnalysisSystemPrompt } = require('../../lib/server/perfume-analysis-prompt');
const { buildAnalysisResponseSchema, extractJsonObject } = require('../../lib/server/core-analysis.cjs');
const { validateLLMOutput, formatZodError } = require('../schemas/analysis');

function normalizeImageInput(imageBase64) {
  const trimmed = String(imageBase64 ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:image/')) return trimmed;
  // Detect common image signatures from base64 payload when caller sends raw base64.
  // WEBP: RIFF....WEBP => UklGR...
  // PNG: 89 50 4E 47 => iVBOR...
  // JPEG: FF D8 FF => /9j/
  let mime = 'image/jpeg';
  if (trimmed.startsWith('UklGR')) mime = 'image/webp';
  else if (trimmed.startsWith('iVBOR')) mime = 'image/png';
  else if (trimmed.startsWith('/9j/')) mime = 'image/jpeg';
  return `data:${mime};base64,${trimmed}`;
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

function validateFormattedPayload(formatted) {
  const rawText = extractFormattedText(formatted);
  try {
    const parsedPayload = extractJsonObject(formatted);
    const zodResult = validateLLMOutput(parsedPayload);
    if (!zodResult.success) {
      return {
        ok: false,
        reason: formatZodError(zodResult.error),
        rawText,
      };
    }
    return {
      ok: true,
      parsedPayload,
      rawText,
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'invalid_json',
      rawText,
    };
  }
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
    const validation = validateFormattedPayload(providerResponse.formatted);
    console.log('[Gemini] raw response before parse:', (validation.rawText || '').slice(0, 1200));
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
        const retryValidation = validateFormattedPayload(retryResponse.formatted);
        console.log('[Gemini] retry raw response before parse:', (retryValidation.rawText || '').slice(0, 1200));
        if (retryValidation.ok) {
          retryResponse.parsedPayload = retryValidation.parsedPayload;
          providerResponse = retryResponse;
        } else {
          console.error('[Error] retry Zod/JSON validation failed:', retryValidation.reason);
          providerResponse = {
            ok: false,
            status: 502,
            error: `LLM cevabi semaya uymadi: ${retryValidation.reason}`,
            formatted: retryResponse.formatted,
          };
        }
      } else {
        console.error('[Error] retry provider call failed:', retryResponse?.error || 'unknown_provider_error');
        providerResponse = retryResponse;
      }
    } else {
      providerResponse.parsedPayload = validation.parsedPayload;
    }
  } else {
    console.error('[Error] providerResponse not ok or missing formatted payload:', providerResponse?.error || 'unknown_error');
  }

  return { providerResponse, retryCount };
}

module.exports = { callWithRetry, buildMessages };
