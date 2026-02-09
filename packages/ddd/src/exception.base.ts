import { v4 } from "uuid";

type ErrorConstructorWithCaptureStackTrace = ErrorConstructor & {
  captureStackTrace?: (targetObject: object, constructorOpt?: Function) => void;
};

export interface SerializedException {
  message: string;
  code: string;
  correlationId?: string;
  statusCode?: number;
  stack?: string;
  cause?: string;
  metadata?: unknown;
}

export abstract class ExceptionBase extends Error {
  abstract code: string;

  public readonly correlationId?: string;
  public readonly statusCode?: number;

  /**
   *
   * @param message
   * @param correlationId
   * @param cause
   * @param metadata
   */
  constructor(
    readonly message: string,
    statusCode?: number,
    correlationId?: string,
    readonly cause?: Error,
    readonly metadata?: unknown,
  ) {
    super(message);
    (Error as ErrorConstructorWithCaptureStackTrace).captureStackTrace?.(this, this.constructor);
    this.correlationId = correlationId || v4();
    this.statusCode = statusCode || 500;
  }

  toJSON(): SerializedException {
    return {
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      stack: this.stack,
      correlationId: this.correlationId,
      cause: JSON.stringify(this.cause),
      metadata: this.metadata,
    };
  }
}
