import { Module, DynamicModule, Provider } from "@nestjs/common";
import {
  DISTRIBUTED_SHARED_REPOSITORY,
  ETCD_CLIENT,
  ETCD_OPTIONS,
  ETCD_UNIQUE_ID,
} from "./core/etcd.di-tokens";
import { EtcdDistributedStateRepository } from "./core/distributed-state.repository";
import { randomUUID } from "crypto";
import { Etcd3, IOptions as EtcdOptions } from "etcd3";
import { EtcdModuleAsyncOptions, EtcdModuleOptions } from "./core/etcd.options";
import { EtcdLeaderElectionFeatureService } from "./services";

const createBaseProviders = (): Provider[] => [
  {
    provide: DISTRIBUTED_SHARED_REPOSITORY,
    useClass: EtcdDistributedStateRepository,
  },
  {
    provide: ETCD_UNIQUE_ID,
    useValue: randomUUID(),
  },
];

const createEtcdClient = (options: EtcdOptions) => {
  return new Etcd3(options);
};

const featureServicesProviders = [EtcdLeaderElectionFeatureService];

@Module({})
export class EtcdModule {
  static forRoot(moduleOptions: EtcdModuleOptions): DynamicModule {
    const etcdClient = createEtcdClient(moduleOptions.etcdOptions);
    const providers = [
      ...createBaseProviders(),
      ...featureServicesProviders,
      {
        provide: ETCD_CLIENT,
        useValue: etcdClient,
      },
      {
        provide: ETCD_OPTIONS,
        useValue: moduleOptions,
      },
    ];

    return {
      global: true,
      module: EtcdModule,
      providers,
      exports: providers,
    };
  }

  static forRootAsync(options: EtcdModuleAsyncOptions): DynamicModule {
    const etcdClientProvider: Provider = {
      provide: ETCD_CLIENT,
      useFactory: async (...args: unknown[]) => {
        const moduleOptions = await options.useFactory(...args);
        return createEtcdClient(moduleOptions.etcdOptions);
      },
      inject: options.inject || [],
    };
    const etcdOptionsProvider: Provider = {
      provide: ETCD_OPTIONS,
      useFactory: async (...args: unknown[]) => {
        const moduleOptions = await options.useFactory(...args);
        return moduleOptions;
      },
      inject: options.inject || [],
    };
    const providers = [
      ...createBaseProviders(),
      ...featureServicesProviders,
      etcdClientProvider,
      etcdOptionsProvider,
    ];

    return {
      global: true,
      module: EtcdModule,
      providers,
      exports: providers,
    };
  }
}
