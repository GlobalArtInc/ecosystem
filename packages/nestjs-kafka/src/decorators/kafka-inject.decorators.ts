import { Inject } from "@nestjs/common";
import {
  KAFKA_ADMIN_CLIENT_TOKEN,
  KAFKA_CONFIGURATION_TOKEN,
  KAFKA_CONSUMER_TOKEN,
  KAFKA_PRODUCER_TOKEN,
  KAFKA_SCHEMA_REGISTRY_TOKEN,
} from "../providers/kafka.connection";

/** Injects the raw KafkaJS producer instance provided by KafkaModule. */
export const InjectKafkaProducer = () => Inject(KAFKA_PRODUCER_TOKEN);

/** Injects the raw KafkaJS consumer instance provided by KafkaModule. */
export const InjectKafkaConsumer = () => Inject(KAFKA_CONSUMER_TOKEN);

/** Injects the raw KafkaJS admin client instance provided by KafkaModule. */
export const InjectKafkaAdmin = () => Inject(KAFKA_ADMIN_CLIENT_TOKEN);

/** Injects the KafkaConnectionOptions configuration object provided by KafkaModule. */
export const InjectKafkaConfig = () => Inject(KAFKA_CONFIGURATION_TOKEN);

/** Injects the SchemaRegistryClient instance provided by KafkaModule. */
export const InjectSchemaRegistry = () => Inject(KAFKA_SCHEMA_REGISTRY_TOKEN);
