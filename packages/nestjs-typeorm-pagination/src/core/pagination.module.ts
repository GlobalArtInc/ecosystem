import { DynamicModule, Module, Provider } from "@nestjs/common";
import { DataSource, EntityTarget, ObjectLiteral } from "typeorm";
import {
  DEFAULT_PAGINATION_CONFIG,
  PAGINATION_CONFIG_TOKEN,
} from "../constants";
import { getPaginationToken } from "../decorators";
import { PaginationConfig, PaginationModuleOptions } from "../types";
import { PaginationService } from "./pagination.service";

export interface PaginationModuleAsyncOptions {
  useFactory: (
    ...args: any[]
  ) => PaginationModuleOptions | Promise<PaginationModuleOptions>;
  inject?: any[];
}

@Module({})
export class PaginationModule {
  static forRoot(options: PaginationModuleOptions = {}): DynamicModule {
    const config = this.createConfiguration(options);
    const providers = this.createCoreProviders(config);

    return {
      module: PaginationModule,
      providers,
      exports: providers.map((p: any) => p.provide || p),
      global: true,
    };
  }

  static forRootAsync(options: PaginationModuleAsyncOptions): DynamicModule {
    const configProvider: Provider = {
      provide: PAGINATION_CONFIG_TOKEN,
      useFactory: async (...args: any[]) => {
        const userOptions = await options.useFactory(...args);
        return this.createConfiguration(userOptions);
      },
      inject: options.inject || [],
    };

    const providers = [configProvider];

    return {
      module: PaginationModule,
      providers,
      exports: providers.map((p: any) => p.provide || p),
      global: false,
    };
  }

  static forFeature<TEntity extends ObjectLiteral>(entity: EntityTarget<TEntity>): DynamicModule {
    const provider: Provider = {
      provide: getPaginationToken(entity as any),
      useFactory: (dataSource: DataSource, config: PaginationConfig) =>
        new PaginationService<TEntity>(dataSource, entity, config),
      inject: [DataSource, PAGINATION_CONFIG_TOKEN],
    };

    return {
      module: PaginationModule,
      providers: [provider],
      exports: [provider.provide],
    };
  }

  private static createConfiguration(
    options: PaginationModuleOptions
  ): PaginationConfig {
    return {
      ...DEFAULT_PAGINATION_CONFIG,
      ...options,
    };
  }

  private static createCoreProviders(config: PaginationConfig): Provider[] {
    return [
      {
        provide: PAGINATION_CONFIG_TOKEN,
        useValue: config,
      },
    ];
  }
}
