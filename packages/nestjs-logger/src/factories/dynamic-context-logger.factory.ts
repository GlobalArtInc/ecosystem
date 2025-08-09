import { Injectable, Inject } from "@nestjs/common";
import { LoggerService } from "../core/logger.service";
import { FormatterFactory } from "./formatter.factory";
import { ConsoleWriter } from "../writers/console-writer";
import { ContextResolver } from "../utils/context-resolver";
import { LoggerConfiguration } from "../types";
import { LOGGER_CONFIG_TOKEN } from "../constants";

@Injectable()
export class DynamicContextLoggerFactory {
  private readonly loggerCache = new Map<string, LoggerService>();

  constructor(
    @Inject(LOGGER_CONFIG_TOKEN) private readonly config: LoggerConfiguration,
    private readonly formatterFactory: FormatterFactory,
    private readonly writer: ConsoleWriter,
    private readonly contextResolver: ContextResolver
  ) {}

  createLogger(context: string): LoggerService {
    if (this.loggerCache.has(context)) {
      return this.loggerCache.get(context)!;
    }

    const formatter = this.formatterFactory.create(this.config.format, {
      colors: this.config.colors,
      timestamp: this.config.timestamp,
      context: this.config.context,
    });

    const logger = new LoggerService(
      this.config,
      formatter,
      this.writer,
      this.contextResolver
    );
    logger.setContext(context);

    this.loggerCache.set(context, logger);
    return logger;
  }
}
