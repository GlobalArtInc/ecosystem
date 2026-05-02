import { DynamicModule, FactoryProvider, InjectionToken, Module, ModuleMetadata, Type } from '@nestjs/common';
import { KafkaClient } from "./kafka.client";
import type { KafkaOptions } from "../types/kafka.types";

export interface KafkaClientOptions {
  name: InjectionToken;
  options: KafkaOptions;
}

export interface KafkaClientAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  name: InjectionToken;
  useFactory: (...args: unknown[]) => KafkaOptions | Promise<KafkaOptions>;
  inject?: InjectionToken[];
  extraProviders?: FactoryProvider[];
}

@Module({})
export class KafkaClientsModule {
  static register(clients: KafkaClientOptions[]): DynamicModule {
    const providers = clients.map<FactoryProvider>((client) => ({
      provide: client.name,
      useFactory: () => new KafkaClient(client.options),
    }));

    return {
      module: KafkaClientsModule,
      providers,
      exports: providers.map((p) => p.provide),
    };
  }

  static registerAsync(clients: KafkaClientAsyncOptions[]): DynamicModule {
    const providers = clients.flatMap<FactoryProvider>((client) => [
      {
        provide: client.name,
        useFactory: async (...args: unknown[]) => {
          const options = await client.useFactory(...args);
          return new KafkaClient(options);
        },
        inject: client.inject ?? [],
      },
      ...(client.extraProviders ?? []),
    ]);

    const imports = clients.flatMap((c) => c.imports ?? []);

    return {
      module: KafkaClientsModule,
      imports,
      providers,
      exports: clients.map((c) => c.name),
    };
  }
}
