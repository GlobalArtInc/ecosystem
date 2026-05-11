import {
  DynamicModule,
  FactoryProvider,
  InjectionToken,
  Module,
  ModuleMetadata,
} from "@nestjs/common";
import { KafkaJS } from "@confluentinc/kafka-javascript";
import type { KafkaRdKafkaConfig } from "../utils/rdkafka-config";
import { toGlobalRdKafkaConfig, hasSslConfig } from "../utils/rdkafka-config";

/** Options for creating a standalone Kafka admin client. */
export interface KafkaAdminOptions {
  brokers: string[];
  clientId?: string;
  ssl?: boolean;
  sasl?: KafkaJS.SASLOptions;
  rdKafka?: KafkaRdKafkaConfig;
}

/** Options for registering a named Kafka admin client synchronously. */
export interface KafkaAdminClientOptions {
  name: InjectionToken;
  options: KafkaAdminOptions;
}

/** Options for registering a named Kafka admin client asynchronously via a factory. */
export interface KafkaAdminClientAsyncOptions extends Pick<
  ModuleMetadata,
  "imports"
> {
  name: InjectionToken;
  useFactory: (
    ...args: unknown[]
  ) => KafkaAdminOptions | Promise<KafkaAdminOptions>;
  inject?: InjectionToken[];
}

const createAdminProvider = (
  name: InjectionToken,
  options: KafkaAdminOptions,
): FactoryProvider => {
  return {
    provide: name,
    useFactory: async (): Promise<KafkaJS.Admin> => {
      const sslEnabled = options.ssl ?? hasSslConfig(options.rdKafka);
      const admin = new KafkaJS.Kafka({
        ...toGlobalRdKafkaConfig(options.rdKafka),
        kafkaJS: {
          brokers: options.brokers,
          clientId: options.clientId,
          ...(sslEnabled && { ssl: true }),
          ...(options.sasl && { sasl: options.sasl }),
        },
      }).admin();
      await admin.connect();
      return admin;
    },
  };
};

/** NestJS module for registering one or more named `KafkaJS.Admin` instances. */
@Module({})
export class KafkaAdminModule {
  static register(clients: KafkaAdminClientOptions[]): DynamicModule {
    const providers = clients.map((c) =>
      createAdminProvider(c.name, c.options),
    );
    return {
      module: KafkaAdminModule,
      providers,
      exports: providers.map((p) => p.provide),
    };
  }

  static registerAsync(clients: KafkaAdminClientAsyncOptions[]): DynamicModule {
    const providers = clients.map<FactoryProvider>((client) => ({
      provide: client.name,
      useFactory: async (...args: unknown[]): Promise<KafkaJS.Admin> => {
        const options = await client.useFactory(...args);
        return createAdminProvider(client.name, options).useFactory();
      },
      inject: client.inject ?? [],
    }));

    return {
      module: KafkaAdminModule,
      imports: clients.flatMap((c) => c.imports ?? []),
      providers,
      exports: clients.map((c) => c.name),
    };
  }
}
