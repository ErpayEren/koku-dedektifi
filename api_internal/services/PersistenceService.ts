/* eslint-disable @typescript-eslint/no-require-imports */
const { persistAnalysisRecord } = require('../../lib/server/core-analysis.cjs') as {
  persistAnalysisRecord: (params: {
    analysis: unknown;
    mode: string;
    inputText: string;
    appUserId: string | null;
  }) => Promise<{ id: string; slug?: string | null; createdAt?: string } | null>;
};

export interface PersistParams {
  analysis: unknown;
  mode: string;
  inputText: string;
  appUserId: string | null;
}

export interface PersistedRecord {
  id: string;
  slug: string | null;
  createdAt?: string;
}

export async function persistResult(params: PersistParams): Promise<PersistedRecord | null> {
  try {
    const record = await persistAnalysisRecord(params);
    if (!record) return null;
    return {
      id: record.id,
      slug: record.slug ?? null,
      createdAt: record.createdAt,
    };
  } catch {
    return null;
  }
}
