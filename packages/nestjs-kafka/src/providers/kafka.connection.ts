import { KafkaJS } from "@confluentinc/kafka-javascript";
import { SchemaRegistryClient } from "@confluentinc/schemaregistry";
import { DynamicModule, Provider } from "@nestjs/common";
import { KafkaAdminClientOptions } from "../interfaces/kafka-admin-client-options";
import {
  KafkaConnectionAsyncOptions,
  KafkaConnectionOptions,
} from "../interfaces/kafka-connection-options";
import { KafkaConsumerOptions } from "../interfaces/kafka-consumer-options";
import { KafkaProducerOptions } from "../interfaces/kafka-producer-options";
import { KafkaSchemaRegistryClientOptions } from "../interfaces/kafka-schema-registry-options";
import { KafkaAdminService } from "./kafka.admin";
import { KafkaHealthIndicator } from "./kafka.health";
import { KafkaMetricsService } from "./kafka.metrics";
import { HealthIndicatorService } from "@nestjs/terminus";

/** Injection token for the Kafka admin client. */
export const KAFKA_ADMIN_CLIENT_TOKEN = "KAFKA_ADMIN_CLIENT";
/** Injection token for the Kafka producer. */
export const KAFKA_PRODUCER_TOKEN = "KAFKA_PRODUCER";
/** Injection token for the Kafka consumer. */
export const KAFKA_CONSUMER_TOKEN = "KAFKA_CONSUMER";
/** Injection token for the Kafka connection configuration. */
export const KAFKA_CONFIGURATION_TOKEN = "KAFKA_CONFIGURATION";
/** Injection token for the Schema Registry client. */
export const KAFKA_SCHEMA_REGISTRY_TOKEN = SchemaRegistryClient;
/** Injection token for the Kafka health indicator. */
export const KAFKA_HEALTH_INDICATOR_TOKEN = KafkaHealthIndicator;
/** Injection token for the Kafka metrics service. */
export const KAFKA_METRICS_TOKEN = KafkaMetricsService;

const createConsumer = (
  consumerOptions: KafkaConsumerOptions,
): KafkaJS.Consumer => {
  return new KafkaJS.Kafka({}).consumer(consumerOptions.conf);
};

const createProducer = (
  producerOptions: KafkaProducerOptions,
): KafkaJS.Producer => {
  return new KafkaJS.Kafka({}).producer(producerOptions.conf);
};

const createAdminClient = (options: KafkaAdminClientOptions): KafkaJS.Admin => {
  return new KafkaJS.Kafka({}).admin(options.conf);
};

const createSchemaRegistry = (
  options: KafkaSchemaRegistryClientOptions,
): SchemaRegistryClient => {
  return new SchemaRegistryClient(options.conf);
};

/** Builds the list of NestJS providers for a synchronous Kafka connection. */
export const getKafkaConnectionProviderList = (
  options: KafkaConnectionOptions,
  pluginModules: DynamicModule[],
): Provider[] => {
  const adminClient: KafkaJS.Admin | undefined =
    options.adminClient && createAdminClient(options.adminClient);
  const consumer: KafkaJS.Consumer | undefined =
    options.consumer && createConsumer(options.consumer);
  const producer: KafkaJS.Producer | undefined =
    options.producer && createProducer(options.producer);
  const schemaRegistry: SchemaRegistryClient | undefined =
    options.schemaRegistry && createSchemaRegistry(options.schemaRegistry);

  const providers: Provider[] = [
    { provide: KAFKA_CONFIGURATION_TOKEN, useValue: options },
    { provide: KAFKA_ADMIN_CLIENT_TOKEN, useValue: adminClient },
    { provide: KAFKA_CONSUMER_TOKEN, useValue: consumer },
    { provide: KAFKA_PRODUCER_TOKEN, useValue: producer },
    { provide: KAFKA_SCHEMA_REGISTRY_TOKEN, useValue: schemaRegistry },
    {
      provide: KafkaMetricsService,
      useValue: new KafkaMetricsService(
        adminClient,
        options.consumer?.conf?.["group.id"],
      ),
    },
    {
      provide: KafkaAdminService,
      useValue: new KafkaAdminService(adminClient),
    },
  ];

  providers.push({
    provide: KAFKA_HEALTH_INDICATOR_TOKEN,
    useFactory: (healthIndicatorService?: HealthIndicatorService) => {
      return new KafkaHealthIndicator(healthIndicatorService, adminClient);
    },
    inject: [{ token: "HealthIndicatorService", optional: true }],
  });

  return providers;
};

/** Builds the list of NestJS providers for an asynchronous Kafka connection. */
export const getAsyncKafkaConnectionProvider = (
  options: KafkaConnectionAsyncOptions,
): Provider[] => {
  return [
    {
      provide: KAFKA_CONFIGURATION_TOKEN,
      useFactory: options.useFactory,
      inject: options.inject,
    },
    {
      provide: KafkaMetricsService,
      useFactory: (
        adminClient?: KafkaJS.Admin,
        config?: KafkaConnectionOptions,
      ) => {
        return new KafkaMetricsService(
          adminClient,
          config?.consumer?.conf?.["group.id"] as string | undefined,
        );
      },
      inject: [
        { token: KAFKA_ADMIN_CLIENT_TOKEN, optional: true },
        { token: KAFKA_CONFIGURATION_TOKEN, optional: true },
      ],
    },
    {
      provide: KafkaAdminService,
      useFactory: (adminClient?: KafkaJS.Admin) =>
        new KafkaAdminService(adminClient),
      inject: [{ token: KAFKA_ADMIN_CLIENT_TOKEN, optional: true }],
    },
    {
      provide: KAFKA_HEALTH_INDICATOR_TOKEN,
      useFactory: (
        healthIndicatorService?: HealthIndicatorService,
        adminClient?: KafkaJS.Admin,
      ) => {
        return new KafkaHealthIndicator(healthIndicatorService, adminClient);
      },
      inject: [
        { token: "HealthIndicatorService", optional: true },
        { token: KAFKA_ADMIN_CLIENT_TOKEN, optional: true },
      ],
    },
    {
      provide: KAFKA_ADMIN_CLIENT_TOKEN,
      inject: options.inject,
      useFactory: async (
        ...args: any[]
      ): Promise<KafkaJS.Admin | undefined> => {
        const connectionOptions = await options.useFactory(...args);

        return (
          connectionOptions.adminClient &&
          createAdminClient(connectionOptions.adminClient)
        );
      },
    },
    {
      provide: KAFKA_CONSUMER_TOKEN,
      inject: options.inject,
      useFactory: async (
        ...args: any[]
      ): Promise<KafkaJS.Consumer | undefined> => {
        const connectionOptions = await options.useFactory(...args);

        return (
          connectionOptions.consumer &&
          createConsumer(connectionOptions.consumer)
        );
      },
    },
    {
      provide: KAFKA_PRODUCER_TOKEN,
      inject: options.inject,
      useFactory: async (
        ...args: any[]
      ): Promise<KafkaJS.Producer | undefined> => {
        const connectionOptions = await options.useFactory(...args);

        return (
          connectionOptions.producer &&
          createProducer(connectionOptions.producer)
        );
      },
    },
    {
      provide: SchemaRegistryClient,
      inject: options.inject,
      useFactory: async (
        ...args: any[]
      ): Promise<SchemaRegistryClient | undefined> => {
        const connectionOptions = await options.useFactory(...args);

        return (
          connectionOptions.schemaRegistry &&
          createSchemaRegistry(connectionOptions.schemaRegistry)
        );
      },
    },
  ];
};
