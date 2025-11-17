import { DynamicModule, Module, Provider } from "@nestjs/common";
import { APP_INTERCEPTOR, Reflector } from "@nestjs/core";
import { LoggerService } from "./logger.service";
import { HttpLoggerInterceptor } from "./http-logger.interceptor";
import { FormatterFactory } from "../factories/formatter.factory";
import { DynamicContextLoggerFactory } from "../factories/dynamic-context-logger.factory";
import { ConsoleWriter } from "../writers/console-writer";
import { ContextResolver } from "../utils/context-resolver";
import { DataSanitizer } from "../utils/data-sanitizer";
import { RequestIdGenerator } from "../utils/request-id-generator";
import { ExcludeOption, LoggerConfiguration } from "../types";
import {
  LOGGER_CONFIG_TOKEN,
  LOGGER_SERVICE_TOKEN,
  DYNAMIC_CONTEXT_LOGGER_FACTORY_TOKEN,
  DEFAULT_LOGGER_CONFIG,
} from "../constants";
import {
  InjectLogger,
  getAllContextTokens,
  getContextLoggerToken,
} from "./logger.di-tokens";

export interface LoggerModuleOptions {
  level?: "error" | "warn" | "info" | "debug" | "verbose";
  timestamp?: boolean;
  colors?: boolean;
  context?: string;
  format?: "json" | "text" | "pino";
  sensitiveFields?: string[];
  exclude?: ExcludeOption[];
  logRequests?: boolean;
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
    const contextProviders = this.createDynamicContextProviders();

    return {
      module: LoggerModule,
      providers: [
        ...providers,
        ...contextProviders,
        ...(options.logRequests
          ? [
              {
                provide: APP_INTERCEPTOR,
                useExisting: HttpLoggerInterceptor,
              },
            ]
          : []),
      ],
      exports: [
        LOGGER_SERVICE_TOKEN,
        HttpLoggerInterceptor,
        DYNAMIC_CONTEXT_LOGGER_FACTORY_TOKEN,
        ...contextProviders.map((p: any) => p.provide),
      ],
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
    const contextProviders = this.createDynamicContextProviders();

    return {
      module: LoggerModule,
      providers: [
        ...providers,
        ...contextProviders,
        {
          provide: APP_INTERCEPTOR,
          useFactory: (
            config: LoggerConfiguration,
            interceptor: HttpLoggerInterceptor
          ): HttpLoggerInterceptor | null => {
            return config.logRequests ? interceptor : null;
          },
          inject: [LOGGER_CONFIG_TOKEN, HttpLoggerInterceptor],
        },
      ],
      exports: [
        LOGGER_SERVICE_TOKEN,
        HttpLoggerInterceptor,
        DYNAMIC_CONTEXT_LOGGER_FACTORY_TOKEN,
        ...contextProviders.map((p: any) => p.provide),
      ],
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
        provide: DYNAMIC_CONTEXT_LOGGER_FACTORY_TOKEN,
        useClass: DynamicContextLoggerFactory,
      },
      {
        provide: LOGGER_SERVICE_TOKEN,
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
          LOGGER_SERVICE_TOKEN,
          DataSanitizer,
          RequestIdGenerator,
          LOGGER_CONFIG_TOKEN,
        ],
      },
    ];
  }

  private static createDynamicContextProviders(): Provider[] {
    const contextNames = getAllContextTokens();
    return contextNames.map((context) => ({
      provide: getContextLoggerToken(context),
      useFactory: (factory: DynamicContextLoggerFactory) =>
        factory.createLogger(context),
      inject: [DYNAMIC_CONTEXT_LOGGER_FACTORY_TOKEN],
    }));
  }
}
