import {
  LogEntry,
  HttpRequestLogEntry,
  LoggerConfiguration,
  LogOptions,
} from "../types";

export interface ILogger {
  log(options: LogOptions): void;
  error(options: LogOptions): void;
  warn(options: LogOptions): void;
  debug(options: LogOptions): void;
  verbose(options: LogOptions): void;
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
