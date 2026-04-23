export class RedisConnectionError extends Error {
  constructor(operation: string, cause?: Error) {
    super(
      `Redis operation '${operation}' failed: ${cause?.message ?? 'unknown error'}`,
      { cause },
    );
    this.name = 'RedisConnectionError';
  }
}

export class InvalidParameterError extends Error {
  constructor(parameter: string, value: unknown, expectedType: string) {
    super(`Invalid ${parameter}: expected ${expectedType}, got ${typeof value} (${String(value)})`);
    this.name = 'InvalidParameterError';
  }
}

export class LockNotAcquiredError extends Error {
  constructor(keys: string[]) {
    super(`Failed to acquire lock for resource: ${keys.join(', ')}`);
    this.name = 'LockNotAcquiredError';
  }
}
