import { Injectable, LoggerService as NestLoggerService } from "@nestjs/common";
import type {
  IContextResolver,
  ILogFormatter,
  ILogger,
  ILogWriter,
} from "../contracts/index";
import type {
  HttpRequestLogEntry,
  LogEntry,
  LoggerConfiguration,
  LogLevel,
  LogOptions,
} from "../types/index";
import { getOpenTelemetryTraceIds } from "../utils/opentelemetry-trace";

const PINO_LEVEL_TO_LOG_LEVEL: Record<number, LogLevel> = {
  60: "error",
  50: "error",
  40: "warn",
  30: "info",
  20: "debug",
  10: "verbose",
};

@Injectable()
export class LoggerService implements NestLoggerService, ILogger {
  private context?: string;

  constructor(
    private readonly config: LoggerConfiguration,
    private readonly formatter: ILogFormatter,
    private readonly writer: ILogWriter,
    private readonly contextResolver: IContextResolver
  ) {}

  setContext(context: string): void {
    this.context = context;
  }

  log(options: LogOptions): void {
    this.writeLog("info", options);
  }

  error(options: LogOptions): void {
    this.writeLog("error", options);
  }

  warn(options: LogOptions): void {
    this.writeLog("warn", options);
  }

  debug(options: LogOptions): void {
    this.writeLog("debug", options);
  }

  verbose(options: LogOptions): void {
    this.writeLog("verbose", options);
  }

  logHttpRequest(entry: HttpRequestLogEntry): void {
    const enriched = this.enrichWithTraceIds(entry);
    const formatted = this.formatter.formatHttpRequest(enriched);
    const level = PINO_LEVEL_TO_LOG_LEVEL[entry.level] ?? "info";
    this.writer.write(formatted, level);
  }

  private writeLog(level: LogLevel, options: LogOptions): void {
    const { traceId, spanId } = this.resolveTraceIds(options);
    const entry: LogEntry = {
      level,
      message: options.message,
      timestamp: new Date(),
      context: options.context ?? this.context ?? this.contextResolver.resolve(),
      metadata: options.metadata,
      trace: options.trace,
      traceId,
      spanId,
    };

    const formatted = this.formatter.format(entry);
    this.writer.write(formatted, level);
  }

  private resolveTraceIds(options: LogOptions): { traceId?: string; spanId?: string } {
    if (options.traceId && options.spanId) {
      return { traceId: options.traceId, spanId: options.spanId };
    }
    const otel = getOpenTelemetryTraceIds();
    return {
      traceId: options.traceId ?? otel.traceId,
      spanId: options.spanId ?? otel.spanId,
    };
  }

  private enrichWithTraceIds(entry: HttpRequestLogEntry): HttpRequestLogEntry {
    if (entry.traceId && entry.spanId) return entry;
    const otel = getOpenTelemetryTraceIds();
    return {
      ...entry,
      traceId: entry.traceId ?? otel.traceId,
      spanId: entry.spanId ?? otel.spanId,
    };
  }
}
