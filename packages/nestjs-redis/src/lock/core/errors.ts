/**
 * Error thrown when Redis connection or operation fails.
 *
 * This indicates a problem with the Redis connection or a Redis
 * operation failure, not a normal lock contention scenario.
 *
 * @public
 */
export class RedisConnectionError extends Error {
  constructor(operation: string, cause?: Error) {
    super(
      `Redis operation '${operation}' failed: ${cause?.message || 'Unknown error'}`,
      cause,
    );
    this.name = 'RedisLockError';
  }
}

/**
 * Error thrown when invalid parameters are provided to lock methods.
 *
 * This includes null/undefined values, wrong types, or values outside
 * acceptable ranges (e.g., negative TTL, empty strings).
 *
 * @public
 */
export class InvalidParameterError extends Error {
  constructor(parameter: string, value: unknown, expectedType: string) {
    super(
      `Invalid ${parameter}: expected ${expectedType}, got ${typeof value} (${value})`,
    );
    this.name = 'RedisLockError';
  }
}
