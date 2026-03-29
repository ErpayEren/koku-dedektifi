// api/proxy.js - Koku Dedektifi backend
// Supports Gemini, OpenRouter, and Anthropic with automatic key/provider detection.

const { createRuntimeStore } = require('../lib/server/runtime-store');
const {
  enrichAnalysisResult,
  extractInputTexts,
  matchKnownPerfume,
} = require('../lib/server/perfume-knowledge');
const { buildAdvisorRagContext } = require('../lib/server/advisor-rag');

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;
const API_TIMEOUT_MS = 30 * 1000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_REQUEST_BYTES = 4 * 1024 * 1024;
const MAX_MESSAGE_TEXT_LENGTH = 8000;
const MAX_MESSAGE_BLOCKS = 8;
const MAX_IMAGES_PER_REQUEST = 4;
const MAX_INLINE_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_URL_LENGTH = 4096;
const CACHE_MAX_ENTRIES = 250;

const ALLOWED_ORIGINS = [
  'https://koku-dedektifi.vercel.app',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

const ALLOWED_PROMPT_TYPES = new Set(['analysis', 'advisor']);
const ALLOWED_MESSAGE_ROLES = new Set(['user', 'assistant']);
const ALLOWED_CONTENT_TYPES = new Set(['text', 'image', 'image_url']);
const PROMPT_EXTRA_MAX_LEN = 2000;
const PROMPT_EXTRA_BLOCKED = /<\|im_|SYSTEM:|ASSISTANT:|HUMAN:/i;
const SECURITY_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'X-Robots-Tag': 'noindex, nofollow',
};

const SYSTEM_PROMPTS = {
  analysis: `Sen dunyanin en iyi parfum ve koku analizi uzmansin. Binlerce parfumu, dogal esansi ve koku molekulunu taniyorsun. Ayni zamanda deneyimli bir organik kimyacisin.

GORSEL ANALIZ KURALLARI:
- Parfum sisesi ise etiketi oku, marka ve urunu tani, gercek notalarla cevap ver.
- Dogal ortam veya nesne ise baskin koku bilesenlerini belirle.

KURAL - KOKU PIRAMIDI: Sadece bilinen parfumlerde doldur. Doga, yiyecek veya soyut koku tariflerinde null olabilir.
KURAL - DESCRIPTION: 2-3 cumle, zengin ve siirsel.
KURAL - SIMILAR: 4 oneride ilk 2 dogal benzer, son 2 gercek parfum "Marka - Isim" formatinda.
KURAL - SCORES: freshness, sweetness, warmth 0-100 arasi olsun. Toplam 150-180 bandinda kal.
KURAL - MOLECULES: 2-3 gercek molekul ver. Her biri icin canonical SMILES, formula, family, origin, note ve contribution alanlarini doldur.
KURAL - KOTU KOKULAR: Gercek parfum esdegeri uydurma. similar yerine ["Bu koku icin parfum esdegeri bulunmuyor"] yaz. intensity 5-20 araliginda olsun.
KURAL - PERSONA: Sadece piramidi olan parfumlerde.
KURAL - BENZER PROFIL: Sadece pahali parfumlerde 2-3 alternatif ver. "muadil/dupe/klon" yerine "benzer profil" dili kullan.
KURAL - TECHNICAL: Parfumlerde konsantrasyon/yayilim/kalicilik. Dogal kokularda cesit/koken gibi anlamli teknik alanlar kullan.
KURAL - GECERSIZ GORSEL: Koku kaynagi degilse name="Gecersiz Gorsel", intensity=0.
KURAL - LEGAL: Marka adlari sadece karsilastirma referansi icindir; "birebir ayni", "%100 ayni", "resmi ortak" gibi iddialar kurma.

SADECE JSON don. Baska hicbir sey yazma:
{"iconToken":"floral|woody|amber|fresh|gourmand|aquatic|citrus|spicy|signature","name":"...","family":"Ciceksi/Odunsu/Oryantal/Taze/Fougere/Chypre/Gourmand/Aromatik","intensity":75,"season":["Ilkbahar"],"occasion":"Gunduz","pyramid":null,"description":"...","similar":["...","...","Marka - Isim","Marka - Isim"],"scores":{"freshness":60,"sweetness":40,"warmth":70},"persona":{"gender":"Unisex","age":"25-35","vibe":"...","occasions":["Gece"],"season":"Sonbahar"},"dupes":["Marka - Isim"],"layering":{"pair":"...","result":"..."},"timeline":{"t0":"...","t1":"...","t2":"...","t3":"..."},"technical":[{"label":"Konsantrasyon","value":"EDP"},{"label":"Yayilim","value":"Orta","score":72}],"molecules":[{"smiles":"OC(CC/C=C(/C)C)(C=C)C","name":"Linalool","formula":"C10H18O","family":"Monoterpen Alkol","origin":"Lavanta","note":"top","contribution":"lavanta acilisi"},{"smiles":"O=Cc1ccc(O)c(OC)c1","name":"Vanillin","formula":"C8H8O3","family":"Aromatik Aldehit","origin":"Vanilya","note":"base","contribution":"sicak vanilya derinligi"}]}`,

  advisor: `Sen dunyanin en iyi parfum danismanisin.

KURALLAR:
1. Karsilama yapma, dogrudan ise gir.
2. Kullanici talebinden amaci cikar. Sadece kritikse en fazla 1 netlestirici soru sor.
3. Kullanici kisiyi/profili zaten verdiyse tekrar cinsiyet veya "kime aliyorsun" sorma.
4. Bu konusmada daha once onerilen parfumleri tekrar onermeme.
5. Butce verildiyse butce disina cikma.
6. Her yanitta 3 farkli parfum oner.
7. Eger canli web aramasi yoksa kesin canli fiyat iddia etme. Bunun yerine tahmini fiyat bandi ver ve bunun yaklasik oldugunu belirt.
8. "Muadil/dupe/klon" yerine "benzer profil" ifadesini kullan. Marka adlarinda resmi baglilik iddiasi kurma.

BUTCE:
5000TL+ -> niche/luks
2000-5000TL -> mainstream luks
800-2000TL -> orta
300-800TL -> uygun
300TL alti -> ekonomik

FORMAT:
- Cevabi dogrudan secim odakli ver.
- Her parfum icin: neden uygun + kullanim senaryosu + tahmini fiyat bandi (kisa).
- Her parfum en fazla 2 cumle olsun.`,
};

const ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    iconToken: { type: ['string', 'null'], description: 'Premium ikon anahtari (floral, woody, amber, fresh...).' },
    name: { type: 'string', description: 'Analiz edilen koku veya parfum adi.' },
    family: {
      type: ['string', 'null'],
      enum: ['Ciceksi', 'Odunsu', 'Oryantal', 'Taze', 'Fougere', 'Chypre', 'Gourmand', 'Aromatik', null],
      description: 'Ana koku ailesi.',
    },
    intensity: { type: 'integer', description: '0-100 arasi yogunluk puani.' },
    season: { type: ['array', 'null'], items: { type: 'string' } },
    occasion: { type: ['string', 'null'] },
    pyramid: {
      type: ['object', 'null'],
      properties: {
        top: { type: ['array', 'null'], items: { type: 'string' } },
        middle: { type: ['array', 'null'], items: { type: 'string' } },
        base: { type: ['array', 'null'], items: { type: 'string' } },
      },
    },
    description: { type: 'string', description: '2-3 cumlelik zengin koku anlatimi.' },
    similar: { type: 'array', items: { type: 'string' } },
    scores: {
      type: ['object', 'null'],
      properties: {
        freshness: { type: ['integer', 'null'] },
        sweetness: { type: ['integer', 'null'] },
        warmth: { type: ['integer', 'null'] },
      },
    },
    persona: {
      type: ['object', 'null'],
      properties: {
        gender: { type: ['string', 'null'] },
        age: { type: ['string', 'null'] },
        vibe: { type: ['string', 'null'] },
        occasions: { type: ['array', 'null'], items: { type: 'string' } },
        season: { type: ['string', 'null'] },
      },
    },
    dupes: { type: ['array', 'null'], items: { type: 'string' } },
    layering: {
      type: ['object', 'null'],
      properties: {
        pair: { type: ['string', 'null'] },
        result: { type: ['string', 'null'] },
      },
    },
    timeline: {
      type: ['object', 'null'],
      properties: {
        t0: { type: ['string', 'null'] },
        t1: { type: ['string', 'null'] },
        t2: { type: ['string', 'null'] },
        t3: { type: ['string', 'null'] },
      },
    },
    technical: {
      type: ['array', 'null'],
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
          score: { type: ['number', 'null'] },
        },
        required: ['label', 'value'],
      },
    },
    molecules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          smiles: { type: ['string', 'null'] },
          name: { type: 'string' },
          formula: { type: ['string', 'null'] },
          family: { type: ['string', 'null'] },
          origin: { type: ['string', 'null'] },
          note: { type: ['string', 'null'] },
          contribution: { type: ['string', 'null'] },
        },
        required: ['name'],
      },
    },
  },
  required: ['name', 'intensity', 'description', 'similar', 'molecules'],
};

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

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

function getSystemPrompt(type, extra) {
  const base = SYSTEM_PROMPTS[type] || SYSTEM_PROMPTS.analysis;
  return extra ? `${base}\n\n${extra}` : base;
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';
}

function hashRequest(payload) {
  const str = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return hash.toString(36);
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

  for (let i = start; i < raw.length; i++) {
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

function enrichFormattedAnalysis(formatted, options = {}) {
  const jsonText = extractBalancedJsonString(getTextContent(formatted));
  if (!jsonText) return formatted;

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return formatted;
  }

  const enriched = enrichAnalysisResult(parsed, {
    messages: options.messages,
    annotations: formatted?.annotations,
  });

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

  const normalized = text
    .replace(/\s+/g, ' ')
    .replace(/^asagidaki\s+/i, '')
    .replace(/^bu\s+/i, '')
    .slice(0, 80);
  return normalized || 'Koku Profili';
}

function buildRateLimitedAnalysisFallback({ messages, hasImage, provider }) {
  const inputTexts = extractInputTexts(messages);
  const knownPerfume = matchKnownPerfume(...inputTexts);
  const rawText = extractLastUserText(messages);
  const fallbackName = inferFallbackName(rawText, knownPerfume, hasImage);

  const baseResult = {
    iconToken: knownPerfume ? 'signature' : (hasImage ? 'fresh' : 'aromatic'),
    name: fallbackName,
    family: knownPerfume?.family || 'Aromatik',
    intensity: knownPerfume ? 72 : (hasImage ? 52 : 64),
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

const runtimeStore = createRuntimeStore({
  rateLimitWindowMs: RATE_LIMIT_WINDOW_MS,
  rateLimitMax: RATE_LIMIT_MAX,
  cacheTtlMs: CACHE_TTL_MS,
  cacheMaxEntries: CACHE_MAX_ENTRIES,
});

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

function setSecurityHeaders(res) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(key, value);
  }
}

function getAllowedOrigins(req) {
  const origins = new Set(ALLOWED_ORIGINS);
  const forwardedHost = cleanString(req.headers['x-forwarded-host']);
  const host = cleanString(req.headers.host);
  const candidateHost = forwardedHost || host;

  if (candidateHost) {
    const proto = cleanString(req.headers['x-forwarded-proto'])
      || (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(candidateHost) ? 'http' : 'https');
    origins.add(`${proto}://${candidateHost}`);
  }

  return origins;
}

function setCorsHeaders(req, res) {
  const origin = cleanString(req.headers.origin);
  if (!origin) {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    return true;
  }

  if (!getAllowedOrigins(req).has(origin)) {
    return false;
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  return true;
}

function hasImageInContent(content) {
  if (!Array.isArray(content)) return false;
  return content.some((block) => {
    if (!block || typeof block !== 'object') return false;
    return block.type === 'image' || block.type === 'image_url';
  });
}

function hasImageInMessages(messages) {
  return messages.some((message) => hasImageInContent(message?.content));
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

function getProviderConfig() {
  const preferred = cleanString(process.env.LLM_PROVIDER).toLowerCase();
  const genericKey = cleanString(process.env.LLM_API_KEY);
  const geminiEnvKey = cleanString(process.env.GEMINI_API_KEY);
  const anthropicEnvKey = cleanString(process.env.ANTHROPIC_API_KEY);
  const openRouterEnvKey = cleanString(process.env.OPENROUTER_API_KEY);
  const genericGeminiKey = genericKey && !looksLikeOpenRouterKey(genericKey) && !looksLikeAnthropicKey(genericKey)
    ? genericKey
    : '';

  const openRouterKey = openRouterEnvKey
    || (looksLikeOpenRouterKey(genericKey) ? genericKey : '')
    || (looksLikeOpenRouterKey(anthropicEnvKey) ? anthropicEnvKey : '');

  const anthropicKey = (
    anthropicEnvKey && !looksLikeOpenRouterKey(anthropicEnvKey)
      ? anthropicEnvKey
      : ''
  ) || (looksLikeAnthropicKey(genericKey) ? genericKey : '');

  const configs = {
    gemini: geminiEnvKey || genericGeminiKey ? {
      provider: 'gemini',
      apiKey: geminiEnvKey || genericGeminiKey,
      analysisModel: cleanString(process.env.GEMINI_ANALYSIS_MODEL) || cleanString(process.env.GEMINI_MODEL) || 'gemini-2.5-flash',
      visionModel: cleanString(process.env.GEMINI_VISION_MODEL) || cleanString(process.env.GEMINI_ANALYSIS_MODEL) || cleanString(process.env.GEMINI_MODEL) || 'gemini-2.5-flash',
      advisorModel: cleanString(process.env.GEMINI_ADVISOR_MODEL) || 'gemini-2.5-flash-lite',
      allowWeb: cleanString(process.env.GEMINI_ENABLE_WEB).toLowerCase() !== 'false',
    } : null,
    openrouter: openRouterKey ? {
      provider: 'openrouter',
      apiKey: openRouterKey,
      textModel: cleanString(process.env.OPENROUTER_TEXT_MODEL) || 'openrouter/free',
      visionModel: cleanString(process.env.OPENROUTER_VISION_MODEL) || 'openrouter/free',
      onlineModel: cleanString(process.env.OPENROUTER_ONLINE_MODEL) || 'openrouter/auto',
      allowWeb: isTruthyEnv(process.env.OPENROUTER_ENABLE_WEB),
    } : null,
    anthropic: anthropicKey ? {
      provider: 'anthropic',
      apiKey: anthropicKey,
      model: cleanString(process.env.ANTHROPIC_MODEL) || 'claude-sonnet-4-20250514',
      allowWeb: true,
    } : null,
  };

  if (preferred) {
    if (configs[preferred]) return configs[preferred];
    return {
      error: preferred === 'gemini'
        ? 'LLM_PROVIDER=gemini ama gecerli bir GEMINI_API_KEY bulunamadi.'
        : preferred === 'openrouter'
          ? 'LLM_PROVIDER=openrouter ama gecerli bir OPENROUTER_API_KEY bulunamadi.'
          : 'LLM_PROVIDER=anthropic ama gecerli bir ANTHROPIC_API_KEY bulunamadi.',
    };
  }

  return configs.gemini
    || configs.openrouter
    || configs.anthropic
    || {
      error: 'AI anahtari bulunamadi. En kolay yol GEMINI_API_KEY eklemek. Istersen OPENROUTER_API_KEY veya ANTHROPIC_API_KEY ile de devam edebilirsin.',
    };
}

function getGeminiPayload({ messages, systemPrompt, hasImage, promptType, useWebSearch, providerConfig }) {
  const model = promptType === 'advisor'
    ? providerConfig.advisorModel
    : (hasImage ? providerConfig.visionModel : providerConfig.analysisModel);

  const finalSystemPrompt = useWebSearch
    ? `${systemPrompt}\n\n${providerConfig.allowWeb
      ? 'GOOGLE SEARCH AKTIF. Fiyat, stok, kampanya ve guncellik isteyen iddialarda aramayi kullan; emin olmadigin fiyatlari kesin gibi yazma.'
      : 'NOT: Canli Google Search grounding su an kapali. Guncel fiyat iddia etme; yaklasik fiyat bandi ver.'}`
    : systemPrompt;

  const payload = {
    system_instruction: {
      parts: [{ text: finalSystemPrompt }],
    },
    contents: normalizeMessagesForGemini(messages),
    generationConfig: {
      temperature: promptType === 'analysis' ? 0.35 : 0.7,
      responseMimeType: promptType === 'analysis' ? 'application/json' : 'text/plain',
    },
  };

  if (promptType === 'analysis') {
    payload.generationConfig.responseJsonSchema = ANALYSIS_JSON_SCHEMA;
  }

  if (useWebSearch && providerConfig.allowWeb) {
    payload.tools = [{ google_search: {} }];
  }

  return { model, payload };
}

function getOpenRouterPayload({ messages, systemPrompt, hasImage, promptType, useWebSearch, providerConfig }) {
  const model = useWebSearch && providerConfig.allowWeb
    ? providerConfig.onlineModel
    : (hasImage ? providerConfig.visionModel : providerConfig.textModel);

  const finalSystemPrompt = useWebSearch && !providerConfig.allowWeb
    ? `${systemPrompt}\n\nNOT: Canli web aramasi su an kapali. Guncel fiyat iddia etme; sadece tahmini fiyat araligi ver ve bunun yaklasik oldugunu belirt.`
    : systemPrompt;

  const payload = {
    model,
    max_tokens: useWebSearch ? 2400 : 2200,
    temperature: promptType === 'analysis' ? 0.35 : 0.7,
    messages: [
      { role: 'system', content: finalSystemPrompt },
      ...normalizeMessagesForOpenRouter(messages),
    ],
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
    messages,
  };

  if (promptType === 'analysis') {
    payload.temperature = 0.35;
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
    return provider === 'gemini'
      ? 'Gemini istegi yetki veya proje ayari nedeniyle reddetti.'
      : fallback;
  }
  if (response.status === 429) {
    return 'Saglayici rate limitine takildi. Biraz sonra tekrar dene.';
  }
  return fallback;
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

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': providerConfig.apiKey,
    },
    body: JSON.stringify(payload),
    signal,
  });

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
      'Authorization': `Bearer ${providerConfig.apiKey}`,
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

async function handler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res)) {
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

  const rateCheck = await runtimeStore.checkRateLimit(ip);
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

  const providerConfig = getProviderConfig();
  if (providerConfig.error) {
    log('error', ip, 'Provider config missing');
    return res.status(500).json({ error: providerConfig.error });
  }

  const { messages, promptType = 'analysis', promptExtra = '', useWebSearch = false } = body;
  const hasImage = hasImageInMessages(messages);
  const ragContext = promptType === 'advisor'
    ? await buildAdvisorRagContext({ messages, topK: 6 })
    : { promptBlock: '', meta: { enabled: false } };
  const mergedPromptExtra = [promptExtra, ragContext.promptBlock].filter(Boolean).join('\n\n');
  const systemPrompt = getSystemPrompt(promptType, mergedPromptExtra);

  const shouldCache = !hasImage && !useWebSearch && promptType === 'analysis';
  const cacheKey = shouldCache
    ? hashRequest({
        analysisVersion: 'v2',
        provider: providerConfig.provider,
        promptType,
        promptExtra,
        useWebSearch: false,
        messages,
      })
    : null;

  if (cacheKey) {
    const cached = await runtimeStore.getCache(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-AI-Provider', providerConfig.provider);
      return res.status(200).json(cached);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    log('info', ip, 'API call', {
      provider: providerConfig.provider,
      hasImage,
      promptType,
      useWebSearch,
    });

    const result = providerConfig.provider === 'gemini'
      ? await callGemini({
          providerConfig,
          messages,
          systemPrompt,
          hasImage,
          promptType,
          useWebSearch,
          signal: controller.signal,
        })
      : providerConfig.provider === 'anthropic'
        ? await callAnthropic({
            providerConfig,
            messages,
            systemPrompt,
            promptType,
            useWebSearch,
            signal: controller.signal,
          })
        : await callOpenRouter({
            providerConfig,
            messages,
            systemPrompt,
            hasImage,
            promptType,
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
          provider: providerConfig.provider,
        });
        if (cacheKey) {
          await runtimeStore.setCache(cacheKey, fallbackFormatted);
          res.setHeader('X-Cache', 'MISS');
        }
        res.setHeader('X-AI-Provider', `${providerConfig.provider}-fallback`);
        res.setHeader('X-AI-Fallback', 'rate-limit');
        log('warn', ip, 'Provider rate limited, served fallback', {
          provider: providerConfig.provider,
          status: result.status,
          elapsed,
          hasImage,
        });
        return res.status(200).json(fallbackFormatted);
      }
      log('error', ip, 'Provider error', {
        provider: providerConfig.provider,
        status: result.status,
        elapsed,
      });
      return res.status(result.status).json({ error: result.error });
    }

    if (promptType === 'analysis') {
      result.formatted = enrichFormattedAnalysis(result.formatted, {
        messages,
      });
    } else {
      result.formatted = sanitizeFormattedLegalCopy(result.formatted);
      result.formatted = withAdvisorRagMeta(result.formatted, ragContext.meta);
    }

    if (cacheKey) {
      await runtimeStore.setCache(cacheKey, result.formatted);
      res.setHeader('X-Cache', 'MISS');
    }

    res.setHeader('X-AI-Provider', providerConfig.provider);
    const elapsed = Date.now() - startTime;
    log('info', ip, 'API success', {
      provider: providerConfig.provider,
      store: runtimeStore.getBackendName(),
      elapsed,
      outputTokens: result.formatted?.usage?.output_tokens || 0,
    });

    return res.status(200).json(result.formatted);
  } catch (error) {
    clearTimeout(timeoutId);
    const elapsed = Date.now() - startTime;
    if (error?.name === 'AbortError') {
      log('error', ip, 'Timeout', { provider: providerConfig.provider, elapsed });
      return res.status(504).json({ error: 'Istek zaman asimina ugradi.' });
    }

    log('error', ip, 'Unhandled error', {
      provider: providerConfig.provider,
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
