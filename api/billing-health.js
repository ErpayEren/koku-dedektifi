const SECURITY_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'X-Robots-Tag': 'noindex, nofollow',
};

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function setSecurityHeaders(res) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(key, value);
  }
}

function hasEnv(name) {
  return Boolean(cleanString(process.env[name]));
}

function resolveProvider() {
  return cleanString(process.env.BILLING_PROVIDER).toLowerCase() || 'manual';
}

function getRequiredVars(provider) {
  const common = ['BILLING_WEBHOOK_SECRET'];
  if (provider === 'paddle') {
    return [
      ...common,
      'BILLING_PADDLE_API_KEY',
      'BILLING_PADDLE_PRICE_ID_PRO',
    ];
  }
  if (provider === 'stripe') {
    return [
      ...common,
      'BILLING_STRIPE_SECRET_KEY',
      'BILLING_STRIPE_PRICE_ID_PRO',
      'BILLING_STRIPE_SUCCESS_URL',
      'BILLING_STRIPE_CANCEL_URL',
    ];
  }
  return [
    ...common,
    'BILLING_CHECKOUT_URL_PRO',
  ];
}

function buildReadiness(provider) {
  const required = getRequiredVars(provider);
  const checks = required.map((name) => ({ name, configured: hasEnv(name) }));
  const missing = checks.filter((item) => !item.configured).map((item) => item.name);
  return {
    ready: missing.length === 0,
    provider,
    required: checks,
    missing,
  };
}

async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const provider = resolveProvider();
  const readiness = buildReadiness(provider);
  return res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    billing: readiness,
  });
}

module.exports = handler;
