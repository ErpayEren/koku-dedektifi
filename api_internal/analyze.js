const { cleanString, setCorsHeaders, setSecurityHeaders } = require('../lib/server/config');
const { readAuthSession } = require('../lib/server/auth-session');
const { readEntitlementForUser } = require('../lib/server/billing-store');
const { callAIProvider } = require('../lib/server/provider-router');
const { enforceDailyAnalysisQuota } = require('../lib/server/plan-guard');
const {
  buildAnalysisResponseSchema,
  buildAnalysisSystemPrompt,
  extractJsonObject,
  normalizeAiAnalysisToResult,
  persistAnalysisRecord,
} = require('../lib/server/core-analysis.cjs');

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body && typeof body === 'object' ? body : null;
}

function isValidMode(mode) {
  return mode === 'text' || mode === 'notes' || mode === 'image';
}

function normalizeImageInput(imageBase64) {
  const trimmed = cleanString(imageBase64);
  if (!trimmed) return '';
  if (trimmed.startsWith('data:image/')) return trimmed;
  return `data:image/jpeg;base64,${trimmed}`;
}

function buildMessages(body) {
  if (body.mode === 'image') {
    return [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Bu görseli parfüm uzmanı gibi analiz et. Eğer etiket görünüyorsa ürünü tanı; görünmüyorsa görselin koku karakterine göre en savunulabilir profili üret. Kullanıcı notu: ${
              body.input || 'Görsel analizi'
            }`,
          },
          {
            type: 'image_url',
            image_url: {
              url: normalizeImageInput(body.imageBase64 || ''),
            },
          },
        ],
      },
    ];
  }

  const prefix = body.mode === 'notes' ? 'Aşağıdaki nota listesine göre analiz yap:' : 'Aşağıdaki parfüm/koku girdisini analiz et:';
  return [
    {
      role: 'user',
      content: `${prefix}\n${body.input}`,
    },
  ];
}

module.exports = async function analyzeHandler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res, { methods: 'POST, OPTIONS', headers: 'Content-Type' })) {
    return res.status(403).json({ error: 'Bu origin için erişim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await readAuthSession(req);

  try {
    await enforceDailyAnalysisQuota(req);
  } catch (error) {
    const status = Number(error?.statusCode || 429);
    const body = error?.body || { error: 'Günlük analiz limitine ulaşıldı.' };
    return res.status(status).json(body);
  }

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Geçersiz JSON gövdesi.' });

  if (!isValidMode(body.mode)) {
    return res.status(400).json({ error: 'mode alanı text, notes veya image olmalı.' });
  }

  const input = cleanString(body.input);
  if (!input && body.mode !== 'image') {
    return res.status(400).json({ error: 'input alanı gerekli.' });
  }

  if (body.mode === 'image' && !cleanString(body.imageBase64)) {
    return res.status(400).json({ error: 'imageBase64 alanı gerekli.' });
  }

  const entitlement = auth?.user?.id ? await readEntitlementForUser(auth.user.id) : { tier: 'free' };
  const isPro = entitlement?.tier === 'pro';

  const providerResponse = await callAIProvider(buildMessages({ mode: body.mode, input, imageBase64: body.imageBase64 }), 'analysis', {
    systemPrompt: buildAnalysisSystemPrompt(isPro),
    hasImage: body.mode === 'image',
    useWebSearch: false,
    responseJsonSchema: buildAnalysisResponseSchema(),
  });

  if (!providerResponse.ok || !providerResponse.formatted) {
    return res.status(providerResponse.status || 502).json({
      error: providerResponse.error || 'Analiz oluşturulamadı.',
    });
  }

  try {
    const payload = extractJsonObject(providerResponse.formatted);
    const analysis = normalizeAiAnalysisToResult({
      payload,
      mode: body.mode,
      inputText: input,
      isPro,
    });

    const persisted = await persistAnalysisRecord({
      analysis,
      mode: body.mode,
      inputText: input,
      appUserId: auth?.user?.id || null,
    });

    const finalResult = persisted
      ? {
          ...analysis,
          id: persisted.id,
          createdAt: persisted.createdAt,
        }
      : analysis;

    return res.status(200).json({
      analysis: finalResult,
      plan: isPro ? 'pro' : 'free',
      stored: Boolean(persisted),
    });
  } catch (error) {
    console.error('[api/analyze] normalization failed:', error);
    return res.status(500).json({ error: 'Analiz cevabı işlenemedi.' });
  }
};
