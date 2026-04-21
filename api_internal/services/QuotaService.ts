/* eslint-disable @typescript-eslint/no-require-imports */
export interface QuotaError {
  statusCode: number;
  body: { error: string; retryAfter?: number };
}

export async function enforceQuota(req: unknown): Promise<QuotaError | null> {
  // Lazy require so vi.mock() can intercept in tests
  const { enforceDailyAnalysisQuota } = require('../../lib/server/plan-guard') as {
    enforceDailyAnalysisQuota: (req: unknown) => Promise<void>;
  };
  try {
    await enforceDailyAnalysisQuota(req);
    return null;
  } catch (err: unknown) {
    const error = err as { statusCode?: number; body?: { error: string } };
    return {
      statusCode: Number(error?.statusCode ?? 429),
      body: error?.body ?? { error: 'Günlük analiz limitine ulaşıldı.' },
    };
  }
}
