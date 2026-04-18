export {
  brokerHostnameFromBootstrap,
  resolveConnectionOptions,
} from "./utils/platformatic-kafka.utils";
export {
  DEFAULT_KAFKA_METADATA_MAX_AGE_MS,
  DEFAULT_POSTFIX_CLIENT,
  DEFAULT_POSTFIX_SERVER,
} from "./constants/platformatic-kafka.constants";
export { createPlatformaticKafkaMicroservice } from "./config/platformatic-kafka-microservice.config";
export type { PlatformaticKafkaConnectConfig } from "./config/platformatic-kafka-microservice.config";
export { createPlatformaticKafkaClientBroker } from "./config/platformatic-kafka-client-broker.config";

export { PlatformaticKafkaConsumerModule } from "./consumer/platformatic-kafka-consumer.module";
export type {
  KafkaConsumerModuleAsyncOptions,
  KafkaConsumerModuleOptions,
} from "./consumer/platformatic-kafka-consumer.module";
export type { KafkaMessage } from "./consumer/platformatic-kafka-consumer.message";

export { PlatformaticKafkaClientsModule } from "./client/platformatic-kafka-clients.module";
export type {
  PlatformaticKafkaClientOptions,
  PlatformaticKafkaClientAsyncOptions,
} from "./client/platformatic-kafka-clients.module";
export { PlatformaticKafkaClient } from "./client/platformatic-kafka.client";

export {
  KafkaSubscribe,
  KafkaKey,
  KafkaHeaders,
  KafkaHeader,
  KafkaTopic,
  KafkaPartition,
  KafkaAck,
  KafkaNack,
} from "./decorators/platformatic-kafka.decorators";

export { PlatformaticKafkaStrategy } from "./strategy/platformatic-kafka.strategy";
export { PlatformaticKafkaContext } from "./context/platformatic-kafka.context";
export { PlatformaticKafkaHealthIndicator } from "./health/platformatic-kafka-health.indicator";
export type { KafkaHealthCheckable } from "./health/platformatic-kafka-health.indicator";

export type {
  PlatformaticKafkaOptions,
  PlatformaticKafkaMessage,
  ParsedKafkaMessage,
  KafkaSubscribeOptions,
  KafkaSubscribeMetadata,
  KafkaConsumer,
  KafkaProducer,
} from "./types/platformatic-kafka.types";
export type { ConnectionOptions, SASLOptions } from "@platformatic/kafka";
export { PlatformaticKafkaStatus } from "./types/platformatic-kafka.types";
