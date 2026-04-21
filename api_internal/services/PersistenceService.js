'use strict';

const { persistAnalysisRecord } = require('../../lib/server/core-analysis.cjs');

/**
 * Persists an analysis record. Returns { id, slug, createdAt } or null on failure.
 */
async function persistResult({ analysis, mode, inputText, appUserId }) {
  try {
    const record = await persistAnalysisRecord({ analysis, mode, inputText, appUserId });
    if (!record) return null;
    return { id: record.id, slug: record.slug ?? null, createdAt: record.createdAt };
  } catch {
    return null;
  }
}

module.exports = { persistResult };
