/**
 * Configuration options for Redlock distributed locking.
 */
export interface RedlockOptions {
  /** Clock drift compensation factor (default: 0.01) */
  driftFactor?: number;

  /** Base retry delay in milliseconds (default: 200) */
  retryDelayMs?: number;

  /** Random jitter added to retry delay (default: 100) */
  retryJitterMs?: number;

  /** Maximum retry attempts (default: 3) */
  maxRetryAttempts?: number;

  /**
   * Threshold in milliseconds before lock expiration to attempt extension
   * Only used by the withLock method for automatic lock extension
   * Default: 1000ms (1 second before expiration)
   */
  automaticExtensionThreshold?: number;
}
