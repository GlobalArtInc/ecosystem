import { RequestMethod } from "@nestjs/common";

// Basic Types
export type LogLevel = "error" | "warn" | "info" | "debug" | "verbose";
export type LogFormat = "json" | "text" | "pino";

// Core Interfaces
export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: Date;
  readonly context?: string;
  readonly metadata?: Record<string, unknown>;
  readonly trace?: string;
  readonly traceId?: string;
  readonly spanId?: string;
}

export interface LogOptions {
  message: string;
  context?: string;
  metadata?: Record<string, unknown>;
  trace?: string;
  traceId?: string;
  spanId?: string;
}

// HTTP Logging Interfaces
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

export interface HttpRequestLogEntry {
  readonly level: number;
  readonly time: number;
  readonly pid: number;
  readonly hostname: string;
  readonly req: HttpRequest;
  readonly res: HttpResponse;
  readonly responseTime: number;
  readonly msg: string;
  readonly traceId?: string;
  readonly spanId?: string;
}

// Configuration Interfaces
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
  readonly logRequests?: boolean;
}

export interface FormatterOptions {
  readonly colors: boolean;
  readonly timestamp: boolean;
  readonly context?: string;
}

