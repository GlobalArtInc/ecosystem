import {
  ConfigurableModuleBuilder,
  DynamicModule,
  FactoryProvider,
  MiddlewareConsumer,
  Module,
  NestModule,
  Provider,
} from "@nestjs/common";
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
import { getAllContextTokens, getContextLoggerToken } from "./logger.di-tokens";
import { TraceContextMiddleware } from "./trace-context.middleware";
import { TraceContextService } from "./trace-context.service";

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

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<LoggerModuleOptions>()
  .setClassMethodName("forRoot")
  .setExtras({ global: true }, (definition, extras) => ({
    ...definition,
    global: extras.global,
  }))
  .build();

@Module({})
export class LoggerModule
  extends ConfigurableModuleClass
  implements NestModule
{
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TraceContextMiddleware).forRoutes("*");
  }

  static forRoot(options: typeof OPTIONS_TYPE = {}): DynamicModule {
    const parent = super.forRoot(options);
    const contextProviders = this.createDynamicContextProviders();

    return {
      ...parent,
      providers: [
        ...(parent.providers ?? []),
        ...this.createCoreProviders(),
        ...contextProviders,
        this.createConfigProvider(),
      ],
      exports: [
        ...(parent.exports ?? []),
        ...this.BASE_EXPORTS,
        ...contextProviders.map((p) => p.provide),
      ],
    };
  }

  static forRootAsync(options: typeof ASYNC_OPTIONS_TYPE): DynamicModule {
    const parent = super.forRootAsync(options);
    const contextProviders = this.createDynamicContextProviders();

    return {
      ...parent,
      providers: [
        ...(parent.providers ?? []),
        ...this.createCoreProviders(),
        ...contextProviders,
        this.createConfigProvider(),
      ],
      exports: [
        ...(parent.exports ?? []),
        ...this.BASE_EXPORTS,
        ...contextProviders.map((p) => p.provide),
      ],
    };
  }

  private static readonly BASE_EXPORTS = [
    LOGGER_SERVICE_TOKEN,
    HttpLoggerInterceptor,
    DYNAMIC_CONTEXT_LOGGER_FACTORY_TOKEN,
    TraceContextMiddleware,
    TraceContextService,
  ];

  private static createConfigProvider(): Provider {
    return {
      provide: LOGGER_CONFIG_TOKEN,
      useFactory: (opts: LoggerModuleOptions): LoggerConfiguration => ({
        ...DEFAULT_LOGGER_CONFIG,
        ...opts,
        sensitiveFields: opts.sensitiveFields ?? DEFAULT_LOGGER_CONFIG.sensitiveFields,
        exclude: opts.exclude ?? DEFAULT_LOGGER_CONFIG.exclude,
      }),
      inject: [MODULE_OPTIONS_TOKEN],
    };
  }

  private static createCoreProviders(): Provider[] {
    return [
      TraceContextMiddleware,
      TraceContextService,
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
          contextResolver: ContextResolver,
          traceContextService,
        ) => {
          const formatter = formatterFactory.create(config.format, {
            colors: config.colors,
            timestamp: config.timestamp,
            context: config.context,
          });
          return new LoggerService(
            config, 
            formatter, 
            writer, 
            contextResolver,
            traceContextService
          );
        },
        inject: [
          LOGGER_CONFIG_TOKEN,
          FormatterFactory,
          ConsoleWriter,
          ContextResolver,
          TraceContextService,
        ],
      },
      {
        provide: HttpLoggerInterceptor,
        useFactory: (
          logger: LoggerService,
          sanitizer: DataSanitizer,
          requestIdGenerator: RequestIdGenerator,
          config: LoggerConfiguration,
        ) =>
          new HttpLoggerInterceptor(
            logger,
            sanitizer,
            requestIdGenerator,
            config,
            new Reflector(),
          ),
        inject: [
          LOGGER_SERVICE_TOKEN,
          DataSanitizer,
          RequestIdGenerator,
          LOGGER_CONFIG_TOKEN,
        ],
      },
      { provide: APP_INTERCEPTOR, useExisting: HttpLoggerInterceptor },
    ];
  }

  private static createDynamicContextProviders(): FactoryProvider[] {
    return getAllContextTokens().map((context) => ({
      provide: getContextLoggerToken(context),
      useFactory: (factory: DynamicContextLoggerFactory) =>
        factory.createLogger(context),
      inject: [DYNAMIC_CONTEXT_LOGGER_FACTORY_TOKEN],
    }));
  }
}
