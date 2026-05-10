import { ClientConfig } from "@confluentinc/schemaregistry";

/** Configuration for connecting to a Confluent Schema Registry. */
export interface KafkaSchemaRegistryClientOptions {
  conf: ClientConfig;
}
