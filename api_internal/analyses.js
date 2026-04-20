const { setCorsHeaders, setSecurityHeaders } = require('../lib/server/config');
const { readAuthSession } = require('../lib/server/auth-session');
const { getAnalysisById, listAnalysesForUser, getAnalysisBySlug } = require('../lib/server/core-analysis.cjs');

module.exports = async function analysesHandler(req, res) {
  setSecurityHeaders(res);
  if (!setCorsHeaders(req, res, { methods: 'GET, OPTIONS', headers: 'Content-Type' })) {
    return res.status(403).json({ error: 'Bu origin için erişim izni yok.' });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const analysisId = String(req.query?.id || '').trim();
  const analysisSlug = String(req.query?.slug || '').trim();

  if (analysisSlug) {
    const analysis = await getAnalysisBySlug(analysisSlug);
    if (!analysis) return res.status(404).json({ error: 'Analiz bulunamadı.' });
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ analysis });
  }

  if (analysisId) {
    const analysis = await getAnalysisById(analysisId);
    if (!analysis) {
      return res.status(404).json({ error: 'Analiz bulunamadı.' });
    }
    return res.status(200).json({ analysis });
  }

  const auth = await readAuthSession(req);
  if (!auth?.user?.id) {
    return res.status(401).json({ error: 'Geçmiş için giriş gerekli.' });
  }

  const analyses = await listAnalysesForUser(auth.user.id);
  return res.status(200).json({ analyses });
};
