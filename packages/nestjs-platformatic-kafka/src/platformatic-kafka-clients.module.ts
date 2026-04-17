import { DynamicModule, FactoryProvider, InjectionToken, Module, ModuleMetadata, Type } from '@nestjs/common';
import { PlatformaticKafkaClient } from './platformatic-kafka.client';
import { PlatformaticKafkaOptions } from './platformatic-kafka.types';

export interface PlatformaticKafkaClientOptions {
  name: InjectionToken;
  options: PlatformaticKafkaOptions;
}

export interface PlatformaticKafkaClientAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  name: InjectionToken;
  useFactory: (...args: unknown[]) => PlatformaticKafkaOptions | Promise<PlatformaticKafkaOptions>;
  inject?: InjectionToken[];
  extraProviders?: FactoryProvider[];
}

@Module({})
export class PlatformaticKafkaClientsModule {
  static register(clients: PlatformaticKafkaClientOptions[]): DynamicModule {
    const providers = clients.map<FactoryProvider>((client) => ({
      provide: client.name,
      useFactory: () => new PlatformaticKafkaClient(client.options),
    }));

    return {
      module: PlatformaticKafkaClientsModule,
      providers,
      exports: providers.map((p) => p.provide),
    };
  }

  static registerAsync(clients: PlatformaticKafkaClientAsyncOptions[]): DynamicModule {
    const providers = clients.flatMap<FactoryProvider>((client) => [
      {
        provide: client.name,
        useFactory: async (...args: unknown[]) => {
          const options = await client.useFactory(...args);
          return new PlatformaticKafkaClient(options);
        },
        inject: client.inject ?? [],
      },
      ...(client.extraProviders ?? []),
    ]);

    const imports = clients.flatMap((c) => c.imports ?? []);

    return {
      module: PlatformaticKafkaClientsModule,
      imports,
      providers,
      exports: clients.map((c) => c.name),
    };
  }
}
