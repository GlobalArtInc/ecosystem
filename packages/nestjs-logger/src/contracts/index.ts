import { LogEntry, HttpRequestLogEntry, LoggerConfiguration } from "../types";

export interface ILogger {
  log(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void;
  error(
    message: string,
    trace?: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void;
  warn(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void;
  debug(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void;
  verbose(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void;
  setContext(context: string): void;
  logHttpRequest(entry: HttpRequestLogEntry): void;
}

export interface ILogFormatter {
  format(entry: LogEntry): string;
  formatHttpRequest(entry: HttpRequestLogEntry): string;
}

export interface ILogWriter {
  write(formattedLog: string): void;
}

export interface IContextResolver {
  resolve(): string;
}

export interface IDataSanitizer {
  sanitize(data: unknown): unknown;
}

export interface IRequestIdGenerator {
  generate(): string;
}
