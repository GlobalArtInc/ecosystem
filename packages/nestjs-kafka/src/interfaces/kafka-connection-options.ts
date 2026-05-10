import { ModuleMetadata } from "@nestjs/common";
import { KafkaAdminClientOptions } from "./kafka-admin-client-options";
import { KafkaConsumerOptions } from "./kafka-consumer-options";
import { KafkaProducerOptions } from "./kafka-producer-options";
import { KafkaSchemaRegistryClientOptions } from "./kafka-schema-registry-options";

/** Options for establishing a Kafka connection in KafkaModule. */
export interface KafkaConnectionOptions {
  consumer?: KafkaConsumerOptions;
  producer?: KafkaProducerOptions;
  adminClient?: KafkaAdminClientOptions;
  schemaRegistry?: KafkaSchemaRegistryClientOptions;
  global?: boolean;
}

/** Async variant of {@link KafkaConnectionOptions} for factory-based configuration. */
export interface KafkaConnectionAsyncOptions
  extends Pick<ModuleMetadata, "imports"> {
  useFactory: (
    ...args: any[]
  ) => Promise<KafkaConnectionOptions> | KafkaConnectionOptions;
  inject?: any[];
  global?: boolean;
}
