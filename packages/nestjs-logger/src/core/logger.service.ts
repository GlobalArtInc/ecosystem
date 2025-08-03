import { Injectable, LoggerService as NestLoggerService } from "@nestjs/common";
import {
  ILogger,
  ILogFormatter,
  ILogWriter,
  IContextResolver,
} from "../contracts";
import {
  LogEntry,
  HttpRequestLogEntry,
  LoggerConfiguration,
  LogLevel,
} from "../types";

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

  log(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.writeLog("info", message, context, metadata);
  }

  error(
    message: string,
    trace?: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.writeLog("error", message, context, metadata, trace);
  }

  warn(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.writeLog("warn", message, context, metadata);
  }

  debug(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.writeLog("debug", message, context, metadata);
  }

  verbose(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.writeLog("verbose", message, context, metadata);
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
