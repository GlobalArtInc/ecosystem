import { DynamicModule, FactoryProvider, InjectionToken, Module, ModuleMetadata, Type } from "@nestjs/common";
import { ConfluentKafkaClient } from "./confluent-kafka.client";
import type { ConfluentKafkaOptions } from "../types/confluent-kafka.types";

export interface ConfluentKafkaClientOptions {
  name: InjectionToken;
  options: ConfluentKafkaOptions;
}

export interface ConfluentKafkaClientAsyncOptions extends Pick<ModuleMetadata, "imports"> {
  name: InjectionToken;
  useFactory: (...args: unknown[]) => ConfluentKafkaOptions | Promise<ConfluentKafkaOptions>;
  inject?: InjectionToken[];
  extraProviders?: FactoryProvider[];
}

@Module({})
export class ConfluentKafkaClientsModule {
  static register(clients: ConfluentKafkaClientOptions[]): DynamicModule {
    const providers = clients.map<FactoryProvider>((client) => ({
      provide: client.name,
      useFactory: () => new ConfluentKafkaClient(client.options),
    }));

    return {
      module: ConfluentKafkaClientsModule,
      providers,
      exports: providers.map((p) => p.provide),
    };
  }

  static registerAsync(clients: ConfluentKafkaClientAsyncOptions[]): DynamicModule {
    const providers = clients.flatMap<FactoryProvider>((client) => [
      {
        provide: client.name,
        useFactory: async (...args: unknown[]) => {
          const options = await client.useFactory(...args);
          return new ConfluentKafkaClient(options);
        },
        inject: client.inject ?? [],
      },
      ...(client.extraProviders ?? []),
    ]);

    const imports = clients.flatMap((c) => c.imports ?? []);

    return {
      module: ConfluentKafkaClientsModule,
      imports,
      providers,
      exports: clients.map((c) => c.name),
    };
  }
}
