export interface RedlockOptions {
  /** Clock drift compensation factor (default: 0.01) */
  driftFactor?: number;
  /** Base retry delay in milliseconds (default: 200) */
  retryDelayMs?: number;
  /** Random jitter added to retry delay in milliseconds (default: 100) */
  retryJitterMs?: number;
  /** Maximum retry attempts after initial try (default: 3) */
  maxRetryAttempts?: number;
  /** Timeout for a single Redis acquire/extend command in milliseconds (default: 1000) */
  acquireTimeoutMs?: number;
}
