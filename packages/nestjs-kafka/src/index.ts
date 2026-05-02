export { brokerHostnameFromBootstrap } from "./utils/kafka.utils";
export {
  DEFAULT_KAFKA_METADATA_MAX_AGE_MS,
  DEFAULT_POSTFIX_CLIENT,
  DEFAULT_POSTFIX_SERVER,
} from "./constants/kafka.constants";
export { createKafkaMicroservice } from "./config/kafka-microservice.config";
export type { KafkaConnectConfig } from "./config/kafka-microservice.config";
export { createKafkaClientBroker } from "./config/kafka-client-broker.config";

export { KafkaClientsModule } from "./client/kafka-clients.module";
export type {
  KafkaClientOptions,
  KafkaClientAsyncOptions,
} from "./client/kafka-clients.module";
export { KafkaClient } from "./client/kafka.client";

export {
  KafkaSubscribe,
  KafkaKey,
  KafkaHeaders,
  KafkaHeader,
  KafkaTopic,
  KafkaPartition,
  KafkaAck,
  KafkaNack,
} from "./decorators/kafka.decorators";

export { KafkaStrategy } from "./strategy/kafka.strategy";
export { KafkaContext } from "./context/kafka.context";
export { KafkaHealthIndicator } from "./health/kafka-health.indicator";
export type { KafkaHealthCheckable } from "./health/kafka-health.indicator";

export type {
  KafkaOptions,
  KafkaMessage,
  ParsedKafkaMessage,
  KafkaSubscribeOptions,
  KafkaSubscribeMetadata,
  KafkaConsumer,
  KafkaProducer,
} from "./types/kafka.types";
export type { ConnectionOptions, SASLOptions } from "@platformatic/kafka";
export { KafkaStatus } from "./types/kafka.types";
