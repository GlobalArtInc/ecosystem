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
    this.writeLog("info", options.message, options.context, options.metadata);
  }

  error(options: LogOptions): void {
    this.writeLog(
      "error",
      options.message,
      options.context,
      options.metadata,
      options.trace
    );
  }

  warn(options: LogOptions): void {
    this.writeLog("warn", options.message, options.context, options.metadata);
  }

  debug(options: LogOptions): void {
    this.writeLog("debug", options.message, options.context, options.metadata);
  }

  verbose(options: LogOptions): void {
    this.writeLog(
      "verbose",
      options.message,
      options.context,
      options.metadata
    );
  }

  logHttpRequest(entry: HttpRequestLogEntry): void {
    const formatted = this.formatter.formatHttpRequest(entry);
    this.writer.write(formatted);
  }

  private writeLog(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
    trace?: string
  ): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: context ?? this.context ?? this.contextResolver.resolve(),
      metadata,
      trace,
    };

    const formatted = this.formatter.format(entry);
    this.writer.write(formatted);
  }
}
