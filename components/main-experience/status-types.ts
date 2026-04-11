export type MainStatusCard =
  | { kind: 'not-found' }
  | {
      kind: 'api-error';
      retryCount: number;
      retryLimit: number;
    }
  | { kind: 'daily-limit' }
  | {
      kind: 'rate-limit';
      untilMs: number;
    };

