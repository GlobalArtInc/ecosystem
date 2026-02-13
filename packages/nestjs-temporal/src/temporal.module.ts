import { DynamicModule, Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";

import { TemporalMetadataAccessor } from "./temporal-metadata.accessors";
import { TemporalExplorer } from "./temporal.explorer";
import {
  SharedWorkflowClientOptions,
  TemporalModuleOptions,
} from "./interfaces";
import { createClientProviders } from "./temporal.providers";
import { createClientAsyncProvider } from "./utils";
import {
  ConfigurableModuleClass,
  TEMPORAL_MODULE_ASYNC_OPTIONS_TYPE,
} from "./temporal.module-definition";

/**
 * TemporalModule provides integration between NestJS and Temporal workflow orchestration.
 *
 * Use registerWorker() or registerWorkerAsync() to register Temporal workers that execute activities.
 * Use registerClient() or registerClientAsync() to register Temporal clients for starting workflows.
 */
@Module({})
export class TemporalModule extends ConfigurableModuleClass {
  /**
   * Registers a Temporal worker asynchronously.
   * Useful when configuration depends on other async providers (e.g., ConfigService).
   *
   * @param options - Async worker configuration options
   * @returns Dynamic module configuration
   */
  static registerWorkerAsync(
    options: typeof TEMPORAL_MODULE_ASYNC_OPTIONS_TYPE,
  ): DynamicModule {
    const superDynamicModule = super.registerWorkerAsync(options);
    superDynamicModule.imports?.push(DiscoveryModule);
    superDynamicModule.providers?.push(
      TemporalExplorer,
      TemporalMetadataAccessor,
    );
    superDynamicModule.exports?.push(
      TemporalExplorer,
      TemporalMetadataAccessor,
      DiscoveryModule,
    );

    return {
      ...superDynamicModule,
      exports: [DiscoveryModule],
    };
  }

  /**
   * Registers a Temporal WorkflowClient asynchronously.
   * Useful when configuration depends on other async providers (e.g., ConfigService).
   *
   * @param asyncSharedWorkflowClientOptions - Async client configuration options
   * @returns Dynamic module configuration
   */
  static registerClientAsync(
    asyncSharedWorkflowClientOptions: SharedWorkflowClientOptions,
  ): DynamicModule {
    const providers = createClientAsyncProvider(
      asyncSharedWorkflowClientOptions,
    );

    return {
      global: true,
      module: TemporalModule,
      providers,
      exports: providers,
    };
  }
}
