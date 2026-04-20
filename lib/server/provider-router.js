const { cleanString } = require('./config');
const { ANALYSIS_JSON_SCHEMA } = require('./system-prompts');

function isTruthyEnv(value) {
  return /^(1|true|yes|on)$/i.test(cleanString(value));
}

function looksLikeOpenRouterKey(value) {
  return /^sk-or-v1-/i.test(cleanString(value));
}

function looksLikeAnthropicKey(value) {
  return /^sk-ant-/i.test(cleanString(value));
}

function parseDataUrl(url) {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(cleanString(url));
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function normalizeContentForOpenRouter(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return String(content || '');

  const textBlocks = [];
  const imageBlocks = [];

  for (const block of content) {
    if (!block || typeof block !== 'object') continue;

    if (block.type === 'text' && typeof block.text === 'string' && block.text.trim()) {
      textBlocks.push({ type: 'text', text: block.text });
      continue;
    }

    if (block.type === 'image_url' && block.image_url?.url) {
      imageBlocks.push({
        type: 'image_url',
        image_url: { url: block.image_url.url },
      });
      continue;
    }

    if (block.type === 'image' && block.source?.type === 'base64' && block.source.data) {
      const mediaType = cleanString(block.source.media_type) || 'image/jpeg';
      imageBlocks.push({
        type: 'image_url',
        image_url: { url: `data:${mediaType};base64,${block.source.data}` },
      });
    }
  }

  if (textBlocks.length === 0 && imageBlocks.length === 0) return '';
  if (imageBlocks.length === 0 && textBlocks.length === 1) return textBlocks[0].text;
  return [...textBlocks, ...imageBlocks];
}

function normalizeMessagesForOpenRouter(messages) {
  return messages.map((message) => ({
    role: message.role,
    content: normalizeContentForOpenRouter(message.content),
  }));
}

function normalizeContentForGemini(content) {
  if (typeof content === 'string') {
    return content.trim() ? [{ text: content }] : [];
  }

  if (!Array.isArray(content)) {
    const fallback = String(content || '').trim();
    return fallback ? [{ text: fallback }] : [];
  }

  const parts = [];

  for (const block of content) {
    if (!block || typeof block !== 'object') continue;

    if (block.type === 'text' && typeof block.text === 'string' && block.text.trim()) {
      parts.push({ text: block.text });
      continue;
    }

    if (block.type === 'image' && block.source?.type === 'base64' && block.source.data) {
      parts.push({
        inline_data: {
          mime_type: cleanString(block.source.media_type) || 'image/jpeg',
          data: block.source.data,
        },
      });
      continue;
    }

    if (block.type === 'image_url' && block.image_url?.url) {
      const parsed = parseDataUrl(block.image_url.url);
      if (parsed) {
        parts.push({
          inline_data: {
            mime_type: parsed.mimeType,
            data: parsed.data,
          },
        });
      }
    }
  }

  return parts;
}

function normalizeMessagesForGemini(messages) {
  return messages
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: normalizeContentForGemini(message.content),
    }))
    .filter((message) => Array.isArray(message.parts) && message.parts.length > 0);
}

function normalizeContentForAnthropic(content) {
  if (typeof content === 'string') {
    const text = content.trim();
    return text ? [{ type: 'text', text }] : [];
  }

  if (!Array.isArray(content)) {
    const fallback = String(content || '').trim();
    return fallback ? [{ type: 'text', text: fallback }] : [];
  }

  const blocks = [];

  for (const block of content) {
    if (!block || typeof block !== 'object') continue;

    if (block.type === 'text' && typeof block.text === 'string' && block.text.trim()) {
      blocks.push({ type: 'text', text: block.text });
      continue;
    }

    if (block.type === 'image' && block.source?.type === 'base64' && block.source.data) {
      blocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: cleanString(block.source.media_type) || 'image/jpeg',
          data: block.source.data,
        },
      });
      continue;
    }

    if (block.type === 'image_url' && block.image_url?.url) {
      const parsed = parseDataUrl(block.image_url.url);
      if (parsed) {
        blocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: parsed.mimeType,
            data: parsed.data,
          },
        });
      }
    }
  }

  return blocks;
}

function normalizeMessagesForAnthropic(messages) {
  return messages
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: normalizeContentForAnthropic(message.content),
    }))
    .filter((message) => Array.isArray(message.content) && message.content.length > 0);
}

function resolveProviderConfigs() {
  const preferred = cleanString(process.env.LLM_PROVIDER).toLowerCase();
  const genericKey = cleanString(process.env.LLM_API_KEY);
  const geminiEnvKey = cleanString(process.env.GEMINI_API_KEY);
  const anthropicEnvKey = cleanString(process.env.ANTHROPIC_API_KEY);
  const openRouterEnvKey = cleanString(process.env.OPENROUTER_API_KEY);
  const genericGeminiKey =
    genericKey && !looksLikeOpenRouterKey(genericKey) && !looksLikeAnthropicKey(genericKey) ? genericKey : '';

  const openRouterKey =
    openRouterEnvKey ||
    (looksLikeOpenRouterKey(genericKey) ? genericKey : '') ||
    (looksLikeOpenRouterKey(anthropicEnvKey) ? anthropicEnvKey : '');

  const anthropicKey =
    (anthropicEnvKey && !looksLikeOpenRouterKey(anthropicEnvKey) ? anthropicEnvKey : '') ||
    (looksLikeAnthropicKey(genericKey) ? genericKey : '');

  const configs = {
    gemini:
      geminiEnvKey || genericGeminiKey
        ? {
            provider: 'gemini',
            apiKey: geminiEnvKey || genericGeminiKey,
            analysisModel:
              cleanString(process.env.GEMINI_ANALYSIS_MODEL) ||
              cleanString(process.env.GEMINI_MODEL) ||
              'gemini-2.5-flash',
            visionModel:
              cleanString(process.env.GEMINI_VISION_MODEL) ||
              cleanString(process.env.GEMINI_ANALYSIS_MODEL) ||
              cleanString(process.env.GEMINI_MODEL) ||
              'gemini-2.5-flash',
            advisorModel: cleanString(process.env.GEMINI_ADVISOR_MODEL) || 'gemini-2.5-flash-lite',
            allowWeb: cleanString(process.env.GEMINI_ENABLE_WEB).toLowerCase() !== 'false',
          }
        : null,
    openrouter: openRouterKey
      ? {
          provider: 'openrouter',
          apiKey: openRouterKey,
          textModel: cleanString(process.env.OPENROUTER_TEXT_MODEL) || 'openrouter/free',
          visionModel: cleanString(process.env.OPENROUTER_VISION_MODEL) || 'openrouter/free',
          onlineModel: cleanString(process.env.OPENROUTER_ONLINE_MODEL) || 'openrouter/auto',
          allowWeb: isTruthyEnv(process.env.OPENROUTER_ENABLE_WEB),
        }
      : null,
    anthropic: anthropicKey
      ? {
          provider: 'anthropic',
          apiKey: anthropicKey,
          model: cleanString(process.env.ANTHROPIC_MODEL) || 'claude-sonnet-4-20250514',
          allowWeb: true,
        }
      : null,
  };

  return { preferred, configs };
}

function getProviderConfig() {
  const { preferred, configs } = resolveProviderConfigs();

  if (preferred) {
    if (configs[preferred]) return configs[preferred];
    return {
      error:
        preferred === 'gemini'
          ? 'LLM_PROVIDER=gemini ama gecerli bir GEMINI_API_KEY bulunamadi.'
          : preferred === 'openrouter'
            ? 'LLM_PROVIDER=openrouter ama gecerli bir OPENROUTER_API_KEY bulunamadi.'
            : 'LLM_PROVIDER=anthropic ama gecerli bir ANTHROPIC_API_KEY bulunamadi.',
    };
  }

  return (
    configs.gemini ||
    configs.openrouter ||
    configs.anthropic || {
      error:
        'AI anahtari bulunamadi. En kolay yol GEMINI_API_KEY eklemek. Istersen OPENROUTER_API_KEY veya ANTHROPIC_API_KEY ile de devam edebilirsin.',
    }
  );
}

function getGeminiPayload({ messages, systemPrompt, hasImage, promptType, useWebSearch, providerConfig, responseJsonSchema }) {
  const model =
    promptType === 'advisor'
      ? providerConfig.advisorModel
      : hasImage
        ? providerConfig.visionModel
        : providerConfig.analysisModel;

  const finalSystemPrompt = useWebSearch
    ? `${systemPrompt}\n\n${
        providerConfig.allowWeb
          ? 'GOOGLE SEARCH AKTIF. Fiyat, stok, kampanya ve guncellik isteyen iddialarda aramayi kullan; emin olmadigin fiyatlari kesin gibi yazma.'
          : 'NOT: Canli Google Search grounding su an kapali. Guncel fiyat iddia etme; yaklasik fiyat bandi ver.'
      }`
    : systemPrompt;

  const payload = {
    system_instruction: {
      parts: [{ text: finalSystemPrompt }],
    },
    contents: normalizeMessagesForGemini(messages),
    generationConfig: {
      temperature: promptType === 'analysis' ? 0.2 : 0.7,
      responseMimeType: promptType === 'analysis' ? 'application/json' : 'text/plain',
    },
  };

  if (promptType === 'analysis') {
    payload.generationConfig.responseJsonSchema = responseJsonSchema || ANALYSIS_JSON_SCHEMA;
  }

  if (useWebSearch && providerConfig.allowWeb) {
    payload.tools = [{ google_search: {} }];
  }

  return { model, payload };
}

function getOpenRouterPayload({ messages, systemPrompt, hasImage, promptType, useWebSearch, providerConfig }) {
  const model =
    useWebSearch && providerConfig.allowWeb
      ? providerConfig.onlineModel
      : hasImage
        ? providerConfig.visionModel
        : providerConfig.textModel;

  const finalSystemPrompt =
    useWebSearch && !providerConfig.allowWeb
      ? `${systemPrompt}\n\nNOT: Canli web aramasi su an kapali. Guncel fiyat iddia etme; sadece tahmini fiyat araligi ver ve bunun yaklasik oldugunu belirt.`
      : systemPrompt;

  const payload = {
    model,
    max_tokens: useWebSearch ? 2400 : 2200,
    temperature: promptType === 'analysis' ? 0.2 : 0.7,
    messages: [{ role: 'system', content: finalSystemPrompt }, ...normalizeMessagesForOpenRouter(messages)],
  };

  if (useWebSearch && providerConfig.allowWeb) {
    payload.plugins = [{ id: 'web', max_results: 3 }];
  }

  return payload;
}

function getAnthropicPayload({ messages, systemPrompt, promptType, useWebSearch, providerConfig }) {
  const payload = {
    model: providerConfig.model,
    max_tokens: useWebSearch ? 3000 : 2200,
    system: systemPrompt,
    messages: normalizeMessagesForAnthropic(messages),
  };

  if (promptType === 'analysis') {
    payload.temperature = 0.2;
  }

  if (useWebSearch) {
    payload.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
  }

  return payload;
}

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getErrorMessageFromBody(body) {
  if (!body) return '';
  if (typeof body.error === 'string') return body.error;
  if (typeof body.message === 'string') return body.message;
  if (typeof body.error?.message === 'string') return body.error.message;
  if (Array.isArray(body.content)) {
    const text = body.content.map((item) => item?.text || '').join('').trim();
    if (text) return text;
  }
  return '';
}

function mapProviderError(provider, response, body) {
  const fallback = getErrorMessageFromBody(body) || 'API hatasi';
  const fallbackLower = fallback.toLowerCase();

  if (response.status === 529 || fallbackLower.includes('high demand') || fallbackLower.includes('overloaded')) {
    return 'Model anlık yoğunluk yaşıyor. Sistem otomatik deneme/fallback uyguladı, birkaç saniye sonra yeniden dene.';
  }
  if (response.status === 401) {
    return provider === 'openrouter'
      ? 'OpenRouter API anahtari gecersiz veya eksik.'
      : provider === 'gemini'
        ? 'Gemini API anahtari gecersiz veya eksik.'
        : 'Anthropic API anahtari gecersiz veya eksik.';
  }
  if (response.status === 402) {
    return provider === 'openrouter'
      ? 'OpenRouter tarafinda kredi veya ucretli web arama limiti problemi var.'
      : provider === 'gemini'
        ? 'Gemini tarafinda ucretlendirme veya kota problemi olabilir.'
        : 'Anthropic kredisi bitmis olabilir.';
  }
  if (response.status === 403) {
    return provider === 'gemini' ? 'Gemini istegi yetki veya proje ayari nedeniyle reddetti.' : fallback;
  }
  if (response.status === 429) {
    return 'Saglayici rate limitine takildi. Biraz sonra tekrar dene.';
  }
  return fallback;
}

function isRetryableResult(result) {
  if (!result || result.ok) return false;
  const status = Number(result.status || 0);
  if ([408, 409, 425, 429, 500, 502, 503, 504, 529].includes(status)) return true;
  const message = cleanString(result.error).toLowerCase();
  return message.includes('high demand') || message.includes('overloaded') || message.includes('rate limit');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getProviderChain(primaryProvider) {
  const { preferred, configs } = resolveProviderConfigs();
  const defaultOrder = ['gemini', 'openrouter', 'anthropic'];
  const preferredOrder = preferred ? [preferred, ...defaultOrder] : defaultOrder;
  const uniqueOrder = Array.from(new Set(preferredOrder));
  const filtered = uniqueOrder.filter((provider) => provider !== primaryProvider && configs[provider]);
  return filtered.map((provider) => configs[provider]);
}

async function executeProviderCall(request) {
  if (request.providerConfig.provider === 'gemini') return callGemini(request);
  if (request.providerConfig.provider === 'anthropic') return callAnthropic(request);
  return callOpenRouter(request);
}

async function callGemini({ providerConfig, messages, systemPrompt, hasImage, promptType, useWebSearch, signal }) {
  const { model, payload } = getGeminiPayload({
    messages,
    systemPrompt,
    hasImage,
    promptType,
    useWebSearch,
    providerConfig,
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': providerConfig.apiKey,
      },
      body: JSON.stringify(payload),
      signal,
    },
  );

  const data = await readJsonSafely(response);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: mapProviderError('gemini', response, data),
    };
  }

  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join('').trim() || '';
  if (!text) {
    return {
      ok: false,
      status: 502,
      error: data?.promptFeedback?.blockReason
        ? `Gemini yaniti engelledi: ${data.promptFeedback.blockReason}`
        : 'Gemini bos yanit dondu.',
    };
  }

  return {
    ok: true,
    formatted: {
      content: [{ type: 'text', text }],
      usage: { output_tokens: data?.usageMetadata?.candidatesTokenCount || 0 },
      model,
      annotations: data?.candidates?.[0]?.groundingMetadata || null,
    },
  };
}

async function callOpenRouter({ providerConfig, messages, systemPrompt, hasImage, promptType, useWebSearch, signal }) {
  const payload = getOpenRouterPayload({
    messages,
    systemPrompt,
    hasImage,
    promptType,
    useWebSearch,
    providerConfig,
  });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerConfig.apiKey}`,
      'HTTP-Referer': 'https://koku-dedektifi.vercel.app',
      'X-Title': 'Koku Dedektifi',
    },
    body: JSON.stringify(payload),
    signal,
  });

  const data = await readJsonSafely(response);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: mapProviderError('openrouter', response, data),
    };
  }

  const text = data?.choices?.[0]?.message?.content || '';
  return {
    ok: true,
    formatted: {
      content: [{ type: 'text', text }],
      usage: { output_tokens: data?.usage?.completion_tokens || 0 },
      model: data?.model || payload.model,
      annotations: data?.choices?.[0]?.message?.annotations || [],
    },
  };
}

async function callAnthropic({ providerConfig, messages, systemPrompt, promptType, useWebSearch, signal }) {
  const payload = getAnthropicPayload({
    messages,
    systemPrompt,
    promptType,
    useWebSearch,
    providerConfig,
  });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': providerConfig.apiKey,
      'anthropic-version': '2023-06-01',
      ...(useWebSearch ? { 'anthropic-beta': 'web-search-2025-03-05' } : {}),
    },
    body: JSON.stringify(payload),
    signal,
  });

  const data = await readJsonSafely(response);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: mapProviderError('anthropic', response, data),
    };
  }

  return { ok: true, formatted: data };
}

async function callAIProvider(messages, promptType, apiKeys) {
  const providerConfig = getProviderConfig();
  if (providerConfig.error) {
    return {
      ok: false,
      status: 500,
      error: providerConfig.error,
      providerConfig,
    };
  }

  const request = {
    messages,
    systemPrompt: apiKeys.systemPrompt,
    hasImage: Boolean(apiKeys.hasImage),
    promptType,
    useWebSearch: Boolean(apiKeys.useWebSearch),
    signal: apiKeys.signal,
    responseJsonSchema: apiKeys.responseJsonSchema,
  };
  const providerChain = [providerConfig, ...getProviderChain(providerConfig.provider)];
  let lastFailure = null;

  for (const candidate of providerChain) {
    const candidateRequest = {
      ...request,
      providerConfig: candidate,
    };

    let result = await executeProviderCall(candidateRequest);

    if (!result.ok && isRetryableResult(result)) {
      await delay(420);
      result = await executeProviderCall(candidateRequest);
    }

    if (result.ok) {
      return {
        ...result,
        providerConfig: candidate,
        provider: candidate.provider,
      };
    }

    lastFailure = {
      ...result,
      providerConfig: candidate,
      provider: candidate.provider,
    };
  }

  return (
    lastFailure || {
      ok: false,
      status: 502,
      error: 'Saglayici yaniti alinamadi.',
      providerConfig,
      provider: providerConfig.provider,
    }
  );
}

module.exports = {
  callAIProvider,
  getProviderConfig,
};
