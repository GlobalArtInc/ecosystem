export { createConfluentKafkaMicroservice } from "./config/confluent-kafka-microservice.config";
export type { ConfluentKafkaConnectConfig } from "./config/confluent-kafka-microservice.config";
export { createConfluentKafkaClientBroker } from "./config/confluent-kafka-client-broker.config";

export { ConfluentKafkaConsumerModule } from "./consumer/confluent-kafka-consumer.module";
export type {
  KafkaConsumerModuleAsyncOptions,
  KafkaConsumerModuleOptions,
} from "./consumer/confluent-kafka-consumer.module";
export type { KafkaMessage } from "./consumer/confluent-kafka-consumer.message";

export { ConfluentKafkaClientsModule } from "./client/confluent-kafka-clients.module";
export type {
  ConfluentKafkaClientOptions,
  ConfluentKafkaClientAsyncOptions,
} from "./client/confluent-kafka-clients.module";
export { ConfluentKafkaClient } from "./client/confluent-kafka.client";

export {
  KafkaSubscribe,
  KafkaKey,
  KafkaHeaders,
  KafkaHeader,
  KafkaTopic,
  KafkaPartition,
  KafkaAck,
  KafkaNack,
} from "./decorators/confluent-kafka.decorators";

export { ConfluentKafkaStrategy } from "./strategy/confluent-kafka.strategy";
export { ConfluentKafkaContext } from "./context/confluent-kafka.context";
export { ConfluentKafkaHealthIndicator } from "./health/confluent-kafka-health.indicator";
export type { KafkaHealthCheckable } from "./health/confluent-kafka-health.indicator";

export type {
  ConfluentKafkaOptions,
  ConfluentKafkaMessage,
  ParsedConfluentKafkaMessage,
  KafkaSubscribeOptions,
  KafkaSubscribeMetadata,
  ConfluentKafkaProducer,
  ConfluentKafkaConsumer,
  ConfluentKafkaSslOptions,
  ConfluentKafkaProducerConfig,
  ConfluentKafkaConsumerConfig,
  ConfluentKafkaConsumeOptions,
  ReconnectConfig,
} from "./types/confluent-kafka.types";
export { ConfluentKafkaStatus } from "./types/confluent-kafka.types";

export {
  DEFAULT_POSTFIX_CLIENT,
  DEFAULT_POSTFIX_SERVER,
  DEFAULT_KAFKA_GROUP,
  DEFAULT_KAFKA_CLIENT_ID,
} from "./constants/confluent-kafka.constants";
