// Module
export { KafkaModule } from "./kafka/kafka.module";

// Strategy transport
export { KafkaStrategy } from "./kafka/strategy/kafka.strategy";
export { KafkaContext } from "./kafka/context/kafka.context";
export { KafkaHealthIndicator } from "./kafka/health/kafka-health.indicator";
export type { KafkaHealthCheckable } from "./kafka/health/kafka-health.indicator";

// Client
export { KafkaClient } from "./kafka/client/kafka.client";
export { KafkaClientsModule } from "./kafka/client/kafka-clients.module";
export type {
  KafkaClientOptions,
  KafkaClientAsyncOptions,
} from "./kafka/client/kafka-clients.module";

// Config helpers
export { createKafkaMicroservice } from "./kafka/config/kafka-microservice.config";
export type { KafkaConnectConfig } from "./kafka/config/kafka-microservice.config";
export { createKafkaClientBroker } from "./kafka/config/kafka-client-broker.config";

// Decorators
export {
  KafkaSubscribe,
  KafkaMessageKey,
  KafkaMessageHeaders,
  KafkaMessageHeader,
  KafkaMessageTopic,
  KafkaMessagePartition,
  KafkaMessageAck,
  KafkaMessageNack,
} from "./kafka/decorators/kafka.decorators";

// Types
export {
  KafkaStatus,
} from "./kafka/types/kafka.types";
export type {
  KafkaOptions,
  KafkaMessage,
  KafkaConsumer,
  KafkaHeaders,
  KafkaKey,
  KafkaAck,
  KafkaNack,
  KafkaProducer,
  ParsedKafkaMessage,
  KafkaSubscribeOptions,
  KafkaSubscribeMetadata,
} from "./kafka/types/kafka.types";

// Module interfaces
export type {
  KafkaConnectionOptions,
  KafkaConnectionAsyncOptions,
} from "./kafka/interfaces/kafka-connection-options";
