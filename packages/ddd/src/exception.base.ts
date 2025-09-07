export interface SerializedException {
  message: string;
  code: string;
  correlationId?: string;
  stack?: string;
  cause?: string;
  metadata?: unknown;
}

export abstract class ExceptionBase extends Error {
  abstract code: string;

  public readonly correlationId?: string;

  /**
   *
   * @param message
   * @param correlationId
   * @param cause
   * @param metadata
   */
  constructor(
    readonly message: string,
    correlationId?: string,
    readonly cause?: Error,
    readonly metadata?: unknown,
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.correlationId = correlationId;
  }

  toJSON(): SerializedException {
    return {
      message: this.message,
      code: this.code,
      stack: this.stack,
      correlationId: this.correlationId,
      cause: JSON.stringify(this.cause),
      metadata: this.metadata,
    };
  }
}
