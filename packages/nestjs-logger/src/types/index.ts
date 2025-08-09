import { RequestMethod } from "@nestjs/common";

export type LogLevel = "error" | "warn" | "info" | "debug" | "verbose";
export type LogFormat = "json" | "text" | "pino";

export const LOG_LEVELS: Record<LogLevel, number> = {
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  verbose: 10,
} as const;

export const PINO_LEVELS: Record<number, string> = {
  60: "FATAL",
  50: "ERROR",
  40: "WARN",
  30: "INFO",
  20: "DEBUG",
  10: "TRACE",
} as const;

export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: Date;
  readonly context?: string;
  readonly metadata?: Record<string, unknown>;
  readonly trace?: string;
}

export interface HttpRequestLogEntry {
  readonly level: number;
  readonly time: number;
  readonly pid: number;
  readonly hostname: string;
  readonly req: HttpRequest;
  readonly res: HttpResponse;
  readonly responseTime: number;
  readonly msg: string;
}

export interface HttpRequest {
  readonly id: string;
  readonly method: string;
  readonly url: string;
  readonly query: Record<string, unknown>;
  readonly params: Record<string, unknown>;
  readonly headers: Record<string, string>;
  readonly remoteAddress: string;
  readonly remotePort?: number;
  readonly body?: unknown;
}

export interface HttpResponse {
  readonly statusCode: number;
  readonly headers: Record<string, string>;
}

export interface ExcludeOption {
  method: RequestMethod;
  path: string;
}

export interface LoggerConfiguration {
  readonly level: LogLevel;
  readonly timestamp: boolean;
  readonly colors: boolean;
  readonly context?: string;
  readonly format: LogFormat;
  readonly sensitiveFields: readonly string[];
  readonly exclude: readonly ExcludeOption[];
}

export interface FormatterOptions {
  readonly colors: boolean;
  readonly timestamp: boolean;
  readonly context?: string;
}

export interface LogOptions {
  message: string;
  context?: string;
  metadata?: Record<string, unknown>;
  trace?: string;
}
