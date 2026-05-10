// Module
export { KafkaModule } from "./kafka.module";

// Serde
export type { KafkaSerializer, KafkaDeserializer } from "./serde/kafka-serde.interface";
export { JsonKafkaSerializer, JsonKafkaDeserializer } from "./serde/json.serde";
export { ProtobufKafkaSerializer, ProtobufKafkaDeserializer } from "./serde/protobuf.serde";

// Strategy transport
export { KafkaStrategy } from "./strategy/kafka.strategy";
export { RDKAFKA_TRANSPORT } from "./constants/kafka.constants";
export { KafkaContext } from "./context/kafka.context";
export { KafkaHealthIndicator } from "./health/kafka-health.indicator";
export type { KafkaHealthCheckable } from "./health/kafka-health.indicator";
export { KafkaMetricsService } from "./providers/kafka.metrics";
export type { KafkaMetrics } from "./providers/kafka.metrics";
export { KafkaAdminService } from "./providers/kafka.admin";

// Client
export { KafkaClient } from "./client/kafka.client";
export { KafkaClientsModule } from "./client/kafka-clients.module";
export type {
  KafkaClientOptions,
  KafkaClientAsyncOptions,
} from "./client/kafka-clients.module";

// Config helpers
export { createKafkaMicroservice } from "./config/kafka-microservice.config";
export type { KafkaConnectConfig } from "./config/kafka-microservice.config";
export { createKafkaClientBroker } from "./config/kafka-client-broker.config";

// Decorators
export {
  KafkaMessageKey,
  KafkaMessageHeaders,
  KafkaMessageHeader,
  KafkaMessageTopic,
  KafkaMessagePartition,
  KafkaMessageAck,
  KafkaMessageNack,
} from "./decorators/kafka.decorators";

// Types
export {
  KafkaStatus,
} from "./types/kafka.types";
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
} from "./types/kafka.types";

// Module interfaces
export type {
  KafkaConnectionOptions,
  KafkaConnectionAsyncOptions,
} from "./interfaces/kafka-connection-options";
