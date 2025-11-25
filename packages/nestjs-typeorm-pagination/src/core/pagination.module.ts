import { DynamicModule, Module, Provider } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, EntityTarget, ObjectLiteral } from "typeorm";
import {
  DEFAULT_PAGINATION_CONFIG,
  PAGINATION_CONFIG_TOKEN,
} from "../constants";
import { getCursorPaginationToken, getPaginationToken } from "../decorators";
import { PaginationConfig, PaginationModuleOptions } from "../types";
import { CursorPaginationService } from "./cursor-pagination.service";
import { PaginationService } from "./pagination.service";

export interface PaginationModuleAsyncOptions {
  useFactory: (
    ...args: unknown[]
  ) => PaginationModuleOptions | Promise<PaginationModuleOptions>;
  inject?: Array<string | symbol | Function>;
}

@Module({})
export class PaginationModule {
  static forRoot(options: PaginationModuleOptions = {}): DynamicModule {
    const config = this.createConfiguration(options);
    const providers = this.createCoreProviders(config);

    return {
      module: PaginationModule,
      providers,
      exports: providers.map((p) =>
        typeof p === "object" && "provide" in p ? p.provide : p
      ),
      global: true,
    };
  }

  static forRootAsync(options: PaginationModuleAsyncOptions): DynamicModule {
    const configProvider: Provider = {
      provide: PAGINATION_CONFIG_TOKEN,
      useFactory: async (...args: unknown[]) => {
        const userOptions = await options.useFactory(...args);
        return this.createConfiguration(userOptions);
      },
      inject: options.inject || [],
    };

    const providers = [configProvider];

    return {
      module: PaginationModule,
      providers,
      exports: providers.map((p) =>
        typeof p === "object" && "provide" in p ? p.provide : p
      ),
      global: false,
    };
  }

  static forFeature<TEntity extends ObjectLiteral>(
    entity: EntityTarget<TEntity>,
    options: { withCursorPagination?: boolean } = {}
  ): DynamicModule {
    const providers: Provider[] = [
      {
        provide: getPaginationToken(entity),
        useFactory: (dataSource: DataSource, config: PaginationConfig) =>
          new PaginationService<TEntity>(dataSource, entity, config),
        inject: [DataSource, PAGINATION_CONFIG_TOKEN],
      },
    ];

    if (options.withCursorPagination) {
      providers.push({
        provide: getCursorPaginationToken(entity),
        useFactory: (dataSource: DataSource, config: PaginationConfig) =>
          new CursorPaginationService<TEntity>(dataSource, entity, config),
        inject: [DataSource, PAGINATION_CONFIG_TOKEN],
      });
    }

    return {
      module: PaginationModule,
      imports: [TypeOrmModule],
      providers,
      exports: providers.map((p) =>
        typeof p === "object" && "provide" in p ? p.provide : p
      ),
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
