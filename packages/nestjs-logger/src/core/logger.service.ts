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
import { traceContextStorage } from "./trace-context.storage";
import { nanoid } from "nanoid";
import { TraceContextService } from "./trace-context.service";

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
    private readonly contextResolver: IContextResolver,
    private readonly traceContextService: TraceContextService,
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
    const { traceId, spanId } = this.resolveTraceIds(entry);
    const formatted = this.formatter.formatHttpRequest({
      ...entry,
      traceId,
      spanId,
    });
    const level = PINO_LEVEL_TO_LOG_LEVEL[entry.level] ?? "info";
    this.writer.write(formatted, level);
  }

  private writeLog(level: LogLevel, options: LogOptions): void {
    const { traceId, spanId } = this.resolveTraceIds(options);
    const entry: LogEntry = {
      level,
      message: options.message,
      timestamp: new Date(),
      context:
        options.context ?? this.context ?? this.contextResolver.resolve(),
      metadata: options.metadata,
      trace: options.trace,
      traceId,
      spanId,
    };

    const formatted = this.formatter.format(entry);
    this.writer.write(formatted, level);
  }

  private resolveTraceIds(source: { traceId?: string; spanId?: string }): {
    traceId?: string;
    spanId?: string;
  } {
    if (source.traceId && source.spanId) {
      return { traceId: source.traceId, spanId: source.spanId };
    }
    const correlationId = this.traceContextService.getTraceId();
    const otel = getOpenTelemetryTraceIds();

    return {
      traceId: source.traceId ?? otel.traceId ?? correlationId,
      spanId: source.spanId ?? otel.spanId ?? nanoid(10),
    };
  }
}
