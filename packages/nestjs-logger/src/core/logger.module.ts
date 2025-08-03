import { DynamicModule, Module, Provider } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { LoggerService } from "./logger.service";
import { HttpLoggerInterceptor } from "./http-logger.interceptor";
import { FormatterFactory } from "../factories/formatter.factory";
import { ConsoleWriter } from "../writers/console-writer";
import { ContextResolver } from "../utils/context-resolver";
import { DataSanitizer } from "../utils/data-sanitizer";
import { RequestIdGenerator } from "../utils/request-id-generator";
import { LoggerConfiguration } from "../types";
import { LOGGER_CONFIG_TOKEN, DEFAULT_LOGGER_CONFIG } from "../constants";

export interface LoggerModuleOptions {
  level?: "error" | "warn" | "info" | "debug" | "verbose";
  timestamp?: boolean;
  colors?: boolean;
  context?: string;
  format?: "json" | "text" | "pino";
  sensitiveFields?: string[];
  exclude?: string[];
}

export interface LoggerModuleAsyncOptions {
  useFactory: (
    ...args: any[]
  ) => LoggerModuleOptions | Promise<LoggerModuleOptions>;
  inject?: any[];
}

@Module({})
export class LoggerModule {
  static forRoot(options: LoggerModuleOptions = {}): DynamicModule {
    const config = this.createConfiguration(options);
    const providers = this.createProviders(config);

    return {
      module: LoggerModule,
      providers,
      exports: [LoggerService, HttpLoggerInterceptor],
      global: true,
    };
  }

  static forRootAsync(options: LoggerModuleAsyncOptions): DynamicModule {
    const configProvider: Provider = {
      provide: LOGGER_CONFIG_TOKEN,
      useFactory: async (...args: any[]) => {
        const userOptions = await options.useFactory(...args);
        return this.createConfiguration(userOptions);
      },
      inject: options.inject || [],
    };

    const providers = [configProvider, ...this.createCoreProviders()];

    return {
      module: LoggerModule,
      providers,
      exports: [LoggerService, HttpLoggerInterceptor],
      global: true,
    };
  }

  private static createConfiguration(
    options: LoggerModuleOptions
  ): LoggerConfiguration {
    return {
      ...DEFAULT_LOGGER_CONFIG,
      ...options,
      sensitiveFields:
        options.sensitiveFields ?? DEFAULT_LOGGER_CONFIG.sensitiveFields,
      exclude: options.exclude ?? DEFAULT_LOGGER_CONFIG.exclude,
    };
  }

  private static createProviders(config: LoggerConfiguration): Provider[] {
    return [
      {
        provide: LOGGER_CONFIG_TOKEN,
        useValue: config,
      },
      ...this.createCoreProviders(),
    ];
  }

  private static createCoreProviders(): Provider[] {
    return [
      FormatterFactory,
      ConsoleWriter,
      ContextResolver,
      RequestIdGenerator,
      {
        provide: DataSanitizer,
        useFactory: (config: LoggerConfiguration) =>
          new DataSanitizer(config.sensitiveFields),
        inject: [LOGGER_CONFIG_TOKEN],
      },
      {
        provide: LoggerService,
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

          return new LoggerService(config, formatter, writer, contextResolver);
        },
        inject: [
          LOGGER_CONFIG_TOKEN,
          FormatterFactory,
          ConsoleWriter,
          ContextResolver,
        ],
      },
      {
        provide: HttpLoggerInterceptor,
        useFactory: (
          logger: LoggerService,
          dataSanitizer: DataSanitizer,
          requestIdGenerator: RequestIdGenerator,
          config: LoggerConfiguration
        ) => {
          const reflector = new Reflector();
          return new HttpLoggerInterceptor(
            logger,
            dataSanitizer,
            requestIdGenerator,
            config,
            reflector
          );
        },
        inject: [
          LoggerService,
          DataSanitizer,
          RequestIdGenerator,
          LOGGER_CONFIG_TOKEN,
        ],
      },
    ];
  }
}
