const { enrichAnalysisResult, extractInputTexts, matchKnownPerfume } = require('../lib/server/perfume-knowledge');
const { buildAdvisorRagContext } = require('../lib/server/advisor-rag');
const { MAX_BODY_BYTES, cleanString, setCorsHeaders, setSecurityHeaders } = require('../lib/server/config');
const { getSystemPrompt } = require('../lib/server/system-prompts');
const { callAIProvider, getProviderConfig } = require('../lib/server/provider-router');
const { buildCacheKey, checkRateLimit, getCached, getStoreBackendName, setCached } = require('../lib/server/cache-manager');
const { validateAnalysisPayload } = require('../lib/server/schema-validator');
const { enforceDailyAnalysisQuota } = require('../lib/server/plan-guard');

const API_TIMEOUT_MS = 30 * 1000;
const MAX_REQUEST_BYTES = Math.max(MAX_BODY_BYTES, 4 * 1024 * 1024);
const MAX_MESSAGE_TEXT_LENGTH = 8000;
const MAX_MESSAGE_BLOCKS = 8;
const MAX_IMAGES_PER_REQUEST = 4;
const MAX_INLINE_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_URL_LENGTH = 4096;
const ALLOWED_PROMPT_TYPES = new Set(['analysis', 'advisor']);
const ALLOWED_MESSAGE_ROLES = new Set(['user', 'assistant']);
const ALLOWED_CONTENT_TYPES = new Set(['text', 'image', 'image_url']);
const PROMPT_EXTRA_MAX_LEN = 2000;
const PROMPT_EXTRA_BLOCKED = /<\|im_|SYSTEM:|ASSISTANT:|HUMAN:/i;

const LEGAL_SAFE_REPLACEMENTS = [
  { pattern: /\bmuadil\b/gi, replacement: 'benzer profil' },
  { pattern: /\bdupe\b/gi, replacement: 'benzer profil' },
  { pattern: /\bklon\b/gi, replacement: 'benzer profil' },
  { pattern: /\bbirebir ayni\b/gi, replacement: 'benzer karakterde' },
  { pattern: /\b%?\s*100\s+ayni\b/gi, replacement: 'yaklasik olarak benzer' },
  { pattern: /\b1\s*:\s*1\b/gi, replacement: 'yaklasik benzerlik' },
];

const LEGAL_RISKY_PATTERNS = [
  /\bresmi\s+ortak\b/i,
  /\byetkili\s+satici\b/i,
  /\bkesin\b.{0,16}\borijinal\b/i,
  /\bsahteye\s+gerek\s+yok\b/i,
];

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

function log(level, ip, msg, extra = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    ip: String(ip || 'unknown').slice(0, 32),
    msg,
    ...extra,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else console.log(line);
}

function getApproxBase64Bytes(value) {
  const base64 = cleanString(value);
  if (!base64) return 0;
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function validateContentBlocks(content, imageCounter) {
  if (!Array.isArray(content)) {
    return 'Mesaj icerigi string veya dizi olmali';
  }

  if (content.length === 0) return 'Icerik blogu bos olamaz';
  if (content.length > MAX_MESSAGE_BLOCKS) {
    return `Bir mesaj icinde en fazla ${MAX_MESSAGE_BLOCKS} blok olabilir`;
  }

  for (const block of content) {
    if (!block || typeof block !== 'object') return 'Gecersiz icerik blogu';
    if (!ALLOWED_CONTENT_TYPES.has(block.type)) {
      return `Desteklenmeyen icerik tipi: "${block.type}"`;
    }

    if (block.type === 'text') {
      if (typeof block.text !== 'string' || !block.text.trim()) return 'Bos metin blogu gonderilemez';
      if (block.text.length > MAX_MESSAGE_TEXT_LENGTH) {
        return `Metin blogu cok uzun (max ${MAX_MESSAGE_TEXT_LENGTH} karakter)`;
      }
      continue;
    }

    imageCounter.count += 1;
    if (imageCounter.count > MAX_IMAGES_PER_REQUEST) {
      return `Bir istekte en fazla ${MAX_IMAGES_PER_REQUEST} gorsel olabilir`;
    }

    if (block.type === 'image') {
      if (block.source?.type !== 'base64' || typeof block.source?.data !== 'string') {
        return 'Gorsel blogu base64 formatinda olmali';
      }
      const imageBytes = getApproxBase64Bytes(block.source.data);
      if (imageBytes > MAX_INLINE_IMAGE_BYTES) {
        return 'Gorsel boyutu cok buyuk (max 3MB)';
      }
      continue;
    }

    const imageUrl = cleanString(block.image_url?.url);
    if (!imageUrl) return 'image_url blogu gecersiz';
    if (imageUrl.length > MAX_IMAGE_URL_LENGTH) return 'image_url cok uzun';
    if (!/^data:image\/|^https?:\/\//i.test(imageUrl)) {
      return 'image_url yalnizca data:image veya http/https olabilir';
    }
  }

  return null;
}

function validateRequest(body) {
  if (!body || typeof body !== 'object') return 'Gecersiz istek govdesi';
  if (!Array.isArray(body.messages)) return 'messages dizisi gerekli';
  if (body.messages.length === 0) return 'Mesaj listesi bos';
  if (body.messages.length > 20) return 'Cok fazla mesaj (max 20)';
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_REQUEST_BYTES) {
    return 'Istek cok buyuk (max 4MB)';
  }

  if (body.promptType !== undefined && !ALLOWED_PROMPT_TYPES.has(body.promptType)) {
    return `Gecersiz promptType: "${body.promptType}"`;
  }

  if (body.promptExtra !== undefined) {
    if (typeof body.promptExtra !== 'string') return 'promptExtra string olmali';
    if (body.promptExtra.length > PROMPT_EXTRA_MAX_LEN) {
      return `promptExtra cok uzun (max ${PROMPT_EXTRA_MAX_LEN} karakter)`;
    }
    if (PROMPT_EXTRA_BLOCKED.test(body.promptExtra)) {
      return 'promptExtra gecersiz karakter iceriyor';
    }
  }

  if (body.useWebSearch !== undefined && typeof body.useWebSearch !== 'boolean') {
    return 'useWebSearch boolean olmali';
  }

  const imageCounter = { count: 0 };
  for (const message of body.messages) {
    if (!message || typeof message !== 'object') return 'Gecersiz mesaj formati';
    if (!ALLOWED_MESSAGE_ROLES.has(message.role)) {
      return `Gecersiz mesaj rolu: "${message.role}"`;
    }

    if (typeof message.content === 'string') {
      if (!message.content.trim()) return 'Bos mesaj gonderilemez';
      if (message.content.length > MAX_MESSAGE_TEXT_LENGTH) {
        return `Mesaj metni cok uzun (max ${MAX_MESSAGE_TEXT_LENGTH} karakter)`;
      }
      continue;
    }

    const blockError = validateContentBlocks(message.content, imageCounter);
    if (blockError) return blockError;
  }

  return null;
}

function hasImageInContent(content) {
  if (!Array.isArray(content)) return false;
  return content.some((block) => block && typeof block === 'object' && (block.type === 'image' || block.type === 'image_url'));
}

function hasImageInMessages(messages) {
  return messages.some((message) => hasImageInContent(message?.content));
}

function getTextContent(formatted) {
  if (!Array.isArray(formatted?.content)) return '';
  return formatted.content.map((block) => block?.text || '').join('').trim();
}

function extractBalancedJsonString(rawText) {
  const raw = cleanString(rawText);
  const start = raw.indexOf('{');
  if (start === -1) return '';

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < raw.length; i += 1) {
    const char = raw[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(start, i + 1);
      }
    }
  }

  return raw.slice(start);
}

function sanitizeLegalText(rawText) {
  let text = cleanString(rawText);
  if (!text) return { text: '', filtered: 0 };

  let filtered = 0;
  LEGAL_SAFE_REPLACEMENTS.forEach(({ pattern, replacement }) => {
    const next = text.replace(pattern, replacement);
    if (next !== text) filtered += 1;
    text = next;
  });

  LEGAL_RISKY_PATTERNS.forEach((pattern) => {
    if (!pattern.test(text)) return;
    filtered += 1;
    text = text.replace(pattern, 'karsilastirma odakli');
  });

  return { text: cleanString(text), filtered };
}

function sanitizeFormattedLegalCopy(formatted) {
  if (!formatted || !Array.isArray(formatted.content)) return formatted;
  let filtered = 0;

  const content = formatted.content.map((block) => {
    if (!block || block.type !== 'text' || typeof block.text !== 'string') return block;
    const sanitized = sanitizeLegalText(block.text);
    filtered += sanitized.filtered;
    return { ...block, text: sanitized.text };
  });

  if (filtered === 0) return formatted;
  return {
    ...formatted,
    content,
    legal: {
      version: 'v1',
      compareTerm: 'benzer profil',
      riskyClaimsFiltered: filtered,
    },
  };
}

function withAdvisorRagMeta(formatted, ragMeta) {
  if (!ragMeta || ragMeta.enabled !== true) return formatted;

  const existing = formatted?.annotations;
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    return {
      ...formatted,
      annotations: {
        ...existing,
        rag: ragMeta,
      },
    };
  }

  if (Array.isArray(existing)) {
    return {
      ...formatted,
      annotations: {
        raw: existing,
        rag: ragMeta,
      },
    };
  }

  return {
    ...formatted,
    annotations: {
      rag: ragMeta,
    },
  };
}

function tryParseAnalysisJson(formatted) {
  const jsonText = extractBalancedJsonString(getTextContent(formatted));
  if (!jsonText) return null;

  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function enrichFormattedAnalysis(formatted, options = {}) {
  const parsed = tryParseAnalysisJson(formatted);
  if (!parsed) return formatted;

  const enriched = enrichAnalysisResult(parsed, {
    messages: options.messages,
    annotations: formatted?.annotations,
  });

  if (!validateAnalysisPayload(enriched)) {
    return formatted;
  }

  return {
    ...formatted,
    content: [{ type: 'text', text: JSON.stringify(enriched) }],
  };
}

function extractLastUserText(messages) {
  if (!Array.isArray(messages)) return '';

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role !== 'user') continue;

    if (typeof message.content === 'string') {
      const raw = cleanString(message.content);
      if (raw) return raw;
      continue;
    }

    if (!Array.isArray(message.content)) continue;
    const parts = message.content
      .filter((block) => block?.type === 'text' && typeof block.text === 'string')
      .map((block) => cleanString(block.text))
      .filter(Boolean);
    if (parts.length) return parts.join(' ');
  }

  return '';
}

function inferFallbackName(rawText, knownPerfume, hasImage) {
  if (knownPerfume?.canonicalName) return knownPerfume.canonicalName;

  const text = cleanString(rawText);
  const quoted = /"([^"]{2,120})"/.exec(text)?.[1];
  if (quoted) return quoted.trim();

  const noteLine = /nota listesi\s*:\s*([^\n]+)/i.exec(text)?.[1];
  if (noteLine) return `${noteLine.split(',')[0].trim()} Profili`;

  if (hasImage) return 'Gorsel Koku Profili';
  if (!text) return 'Koku Profili';

  const normalized = text.replace(/\s+/g, ' ').replace(/^asagidaki\s+/i, '').replace(/^bu\s+/i, '').slice(0, 80);
  return normalized || 'Koku Profili';
}

function buildRateLimitedAnalysisFallback({ messages, hasImage, provider }) {
  const inputTexts = extractInputTexts(messages);
  const knownPerfume = matchKnownPerfume(...inputTexts);
  const rawText = extractLastUserText(messages);
  const fallbackName = inferFallbackName(rawText, knownPerfume, hasImage);

  const baseResult = {
    iconToken: knownPerfume ? 'signature' : hasImage ? 'fresh' : 'aromatic',
    name: fallbackName,
    family: knownPerfume?.family || 'Aromatik',
    intensity: knownPerfume ? 72 : hasImage ? 52 : 64,
    season: knownPerfume?.season || ['Ilkbahar', 'Sonbahar'],
    occasion: knownPerfume?.occasion || (hasImage ? 'Gunduz' : 'Gunluk'),
    description: hasImage
      ? 'AI servisi gecici olarak yogun. Gorsele dayali bu sonuc yedek profil modunda olusturuldu; metin veya nota listesiyle tekrar denersen daha keskin sonuc alirsin.'
      : 'AI servisi gecici olarak yogun. Sonuc yedek profil modunda olusturuldu; birkac dakika sonra tekrar denediginde daha derin sonuc alirsin.',
    similar: knownPerfume?.canonicalName ? [knownPerfume.canonicalName] : ['Benzer profil kesfi'],
    scores: { freshness: 58, sweetness: 44, warmth: 62 },
    technical: [
      { label: 'Analiz Modu', value: 'Yedek (Rate Limit)' },
      { label: 'Saglayici', value: String(provider || 'ai').toUpperCase() },
      { label: 'Durum', value: 'Servis yogun, profil korumali' },
    ],
    layering: {
      pair: knownPerfume?.canonicalName || 'Ayni aileden ikinci bir profil',
      result: 'Tam katmanlama yorumu icin servis normale dondugunde yeniden hesaplanir.',
    },
  };

  const enriched = enrichAnalysisResult(baseResult, { messages });
  enriched.fallbackMeta = {
    reason: 'provider-rate-limit',
    provider: cleanString(provider) || 'unknown',
    hasImage: Boolean(hasImage),
    generatedAt: new Date().toISOString(),
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(enriched) }],
    usage: { output_tokens: 0 },
    model: 'fallback-local-v1',
    annotations: {
      fallback: true,
      reason: 'provider-rate-limit',
    },
  };
}

async function handler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res, { methods: 'POST, OPTIONS', headers: 'Content-Type' })) {
    return res.status(403).json({ error: 'Bu origin icin erisim izni yok.' });
  }
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIP(req);
  const startTime = Date.now();

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Gecersiz JSON govdesi' });
    }
  }

  const validationError = validateRequest(body);
  if (validationError) {
    log('warn', ip, 'Validation failed', { reason: validationError });
    return res.status(400).json({ error: validationError });
  }

  const rateCheck = await checkRateLimit(ip);
  if (!rateCheck.allowed) {
    const retryAfter = Math.ceil((rateCheck.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter);
    res.setHeader('X-RateLimit-Remaining', '0');
    return res.status(429).json({
      error: `Cok fazla istek. ${retryAfter} saniye sonra tekrar dene.`,
      retryAfter,
    });
  }

  res.setHeader('X-RateLimit-Remaining', rateCheck.remaining);

  let quotaInfo = null;
  try {
    quotaInfo = await enforceDailyAnalysisQuota(req);
  } catch (error) {
    return res.status(error?.statusCode || 429).json(
      error?.body || {
        error: 'Gunluk analiz limitine ulastiniz.',
        limit: 5,
        retryAfter: 'yarin',
      },
    );
  }

  if (quotaInfo) {
    res.setHeader('X-Analysis-Limit', String(quotaInfo.limit));
    res.setHeader('X-Analysis-Remaining', String(quotaInfo.remaining));
  }

  const { messages, promptType = 'analysis', promptExtra = '', useWebSearch = false } = body;
  const hasImage = hasImageInMessages(messages);
  const ragContext =
    promptType === 'advisor' ? await buildAdvisorRagContext({ messages, topK: 6 }) : { promptBlock: '', meta: { enabled: false } };
  const mergedPromptExtra = [promptExtra, ragContext.promptBlock].filter(Boolean).join('\n\n');
  const systemPrompt = getSystemPrompt(promptType, mergedPromptExtra);

  const providerConfig = getProviderConfig();
  if (providerConfig.error) {
    log('error', ip, 'Provider config missing');
    return res.status(500).json({ error: providerConfig.error });
  }
  const provider = providerConfig.provider;

  const shouldCache = !hasImage && !useWebSearch && promptType === 'analysis';
  const cacheKey = shouldCache
    ? buildCacheKey({
        body: {
          messages,
          promptType,
          promptExtra,
          useWebSearch: false,
        },
        provider,
      })
    : null;

  if (cacheKey) {
    const cached = await getCached(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-AI-Provider', provider);
      return res.status(200).json(cached);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    log('info', ip, 'API call', {
      provider,
      hasImage,
      promptType,
      useWebSearch,
      plan: quotaInfo?.plan || 'free',
    });

    const result = await callAIProvider(messages, promptType, {
      systemPrompt,
      hasImage,
      useWebSearch,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!result.ok) {
      const elapsed = Date.now() - startTime;
      const canServeFallback = promptType === 'analysis' && [402, 429].includes(Number(result.status || 0));

      if (canServeFallback) {
        const fallbackFormatted = buildRateLimitedAnalysisFallback({
          messages,
          hasImage,
          provider,
        });

        if (cacheKey) {
          await setCached(cacheKey, fallbackFormatted);
          res.setHeader('X-Cache', 'MISS');
        }

        res.setHeader('X-AI-Provider', `${provider}-fallback`);
        res.setHeader('X-AI-Fallback', 'rate-limit');
        log('warn', ip, 'Provider rate limited, served fallback', {
          provider,
          status: result.status,
          elapsed,
          hasImage,
        });
        return res.status(200).json(fallbackFormatted);
      }

      log('error', ip, 'Provider error', {
        provider,
        status: result.status,
        elapsed,
      });
      return res.status(result.status || 500).json({ error: result.error || 'Saglayici hatasi olustu.' });
    }

    if (promptType === 'analysis') {
      result.formatted = enrichFormattedAnalysis(result.formatted, { messages });
    } else {
      result.formatted = sanitizeFormattedLegalCopy(result.formatted);
      result.formatted = withAdvisorRagMeta(result.formatted, ragContext.meta);
    }

    if (cacheKey) {
      await setCached(cacheKey, result.formatted);
      res.setHeader('X-Cache', 'MISS');
    }

    res.setHeader('X-AI-Provider', provider);
    const elapsed = Date.now() - startTime;
    log('info', ip, 'API success', {
      provider,
      store: getStoreBackendName(),
      elapsed,
      outputTokens: result.formatted?.usage?.output_tokens || 0,
    });

    return res.status(200).json(result.formatted);
  } catch (error) {
    clearTimeout(timeoutId);
    const elapsed = Date.now() - startTime;
    if (error?.name === 'AbortError') {
      log('error', ip, 'Timeout', { provider, elapsed });
      return res.status(504).json({ error: 'Istek zaman asimina ugradi.' });
    }

    log('error', ip, 'Unhandled error', {
      provider,
      elapsed,
      error: error?.message || 'unknown',
    });
    return res.status(500).json({ error: 'Beklenmedik bir hata olustu.' });
  }
}

handler.config = {
  api: {
    bodyParser: {
      sizeLimit: '4.5mb',
    },
  },
};

module.exports = handler;
