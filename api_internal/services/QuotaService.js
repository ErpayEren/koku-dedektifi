'use strict';

const { enforceDailyAnalysisQuota } = require('../../lib/server/plan-guard');

/**
 * Returns null if quota passes, or { statusCode, body } on quota exceeded.
 */
async function enforceQuota(req) {
  try {
    await enforceDailyAnalysisQuota(req);
    return null;
  } catch (err) {
    return {
      statusCode: Number(err?.statusCode ?? 429),
      body: err?.body ?? { error: 'Günlük analiz limitine ulaşıldı.' },
    };
  }
}

module.exports = { enforceQuota };
