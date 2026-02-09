import { DynamicModule, Module, Provider, Type } from "@nestjs/common";
import { AbstractDaemon } from "./abstract.daemon";
import { DAEMON_MODULE_OPTIONS } from "./constants/daemon.constants";
import {
  DaemonModuleAsyncOptions,
  DaemonOptions,
} from "./interfaces/daemon.interfaces";
import { DaemonService } from "./daemon.service";

@Module({})
export class DaemonModule {
  static register(options: DaemonOptions): DynamicModule {
    return {
      module: DaemonModule,
      providers: [
        {
          provide: DAEMON_MODULE_OPTIONS,
          useValue: options,
        },
        options.worker,
        DaemonService,
      ],
      exports: [DaemonService],
    };
  }

  static registerAsync(
    worker: Type<AbstractDaemon>,
    options: DaemonModuleAsyncOptions
  ): DynamicModule {
    return {
      module: DaemonModule,
      imports: options.imports || [],
      providers: [
        this.createAsyncOptionsProvider(worker, options),
        worker,
        DaemonService,
        ...(options.inject || []),
      ],
      exports: [DaemonService],
    };
  }

  private static createAsyncOptionsProvider(
    worker: Type<AbstractDaemon>,
    options: DaemonModuleAsyncOptions
  ): Provider {
    return {
      provide: DAEMON_MODULE_OPTIONS,
      useFactory: async (...args: any[]) => {
        const config = await options.useFactory(...args);
        return {
          ...config,
          worker,
        };
      },
      inject: options.inject || [],
    };
  }
}
