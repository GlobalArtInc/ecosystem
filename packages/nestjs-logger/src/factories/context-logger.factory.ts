import { Injectable, Provider } from "@nestjs/common";
import { LoggerService } from "../core/logger.service";
import { FormatterFactory } from "./formatter.factory";
import { ConsoleWriter } from "../writers/console-writer";
import { ContextResolver } from "../utils/context-resolver";
import { LoggerConfiguration } from "../types";
import {
  LOGGER_CONFIG_TOKEN,
  LOGGER_CONTEXT_SERVICE_TOKEN,
} from "../constants";

@Injectable()
export class ContextLoggerFactory {
  static createProvider(context: string): Provider {
    return {
      provide: LOGGER_CONTEXT_SERVICE_TOKEN(context),
      useFactory: (
        config: LoggerConfiguration,
        formatterFactory: FormatterFactory,
        writer: ConsoleWriter,
        contextResolver: ContextResolver
      ) => {
        const formatter = formatterFactory.create(config.format, {
          colors: config.colors,
          timestamp: config.timestamp,
          context: config.context,
        });

        const logger = new LoggerService(
          config,
          formatter,
          writer,
          contextResolver
        );
        logger.setContext(context);
        return logger;
      },
      inject: [
        LOGGER_CONFIG_TOKEN,
        FormatterFactory,
        ConsoleWriter,
        ContextResolver,
      ],
    };
  }
}
