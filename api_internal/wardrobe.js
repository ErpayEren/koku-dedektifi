const { MAX_BODY_BYTES, setCorsHeaders, setSecurityHeaders } = require('../lib/server/config');
const { readAuthSession } = require('../lib/server/auth-session');
const {
  wardrobeStore,
  buildStorageDiagnostics,
  readWardrobe,
  writeWardrobe,
} = require('../lib/server/wardrobe-store');

const WARDROBE_MAX_BODY_BYTES = Math.min(MAX_BODY_BYTES, 160 * 1024);

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

async function handler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res, { methods: 'GET, PUT, OPTIONS' })) {
    return res.status(403).json({ error: 'Bu origin için erişim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'PUT'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await readAuthSession(req);
  if (!auth) return res.status(401).json({ error: 'Giriş gerekli' });

  const rate = await wardrobeStore.checkRateLimit(`wardrobe:${auth.user.id}`);
  if (!rate.allowed) {
    const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'Çok fazla wardrobe isteği', retryAfter });
  }

  if (req.method === 'GET') {
    try {
      const current = await readWardrobe(auth.user.id);
      res.setHeader('X-Wardrobe-Storage', current.source);
      return res.status(200).json({
        ok: true,
        shelf: current.shelf,
        updatedAt: current.updatedAt,
        storage: current.source,
        diagnostics: buildStorageDiagnostics(),
      });
    } catch (error) {
      console.error('[wardrobe] Read error:', error?.message || error);
      return res.status(503).json({
        error: 'Koku Dolabım şu anda kullanılamıyor. Supabase bağlantısını kontrol et.',
        code: 'wardrobe_store_unavailable',
        diagnostics: buildStorageDiagnostics(),
      });
    }
  }

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Geçersiz JSON gövdesi' });
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > WARDROBE_MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'İstek çok büyük' });
  }

  try {
    const saved = await writeWardrobe(auth.user.id, body.shelf || {});
    res.setHeader('X-Wardrobe-Storage', saved.source);
    return res.status(200).json({
      ok: true,
      shelf: saved.shelf,
      updatedAt: saved.updatedAt,
      storage: saved.source,
      diagnostics: buildStorageDiagnostics(),
    });
  } catch (error) {
    console.error('[wardrobe] Write error:', error?.message || error);
    return res.status(503).json({
      error: 'Koku Dolabım kaydedilemedi. Supabase bağlantısını kontrol et.',
      code: 'wardrobe_store_unavailable',
      diagnostics: buildStorageDiagnostics(),
    });
  }
}

handler.config = {
  api: {
    bodyParser: {
      sizeLimit: '192kb',
    },
  },
};

module.exports = handler;
