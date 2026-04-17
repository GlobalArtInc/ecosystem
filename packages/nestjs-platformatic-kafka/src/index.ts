export { createPlatformaticKafkaMicroservice } from "./config/platformatic-kafka-microservice.config";
export type { PlatformaticKafkaConnectConfig } from "./config/platformatic-kafka-microservice.config";

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

export type {
  PlatformaticKafkaOptions,
  PlatformaticKafkaMessage,
  KafkaSubscribeOptions,
  KafkaSubscribeMetadata,
  KafkaConsumer,
  KafkaProducer,
} from "./types/platformatic-kafka.types";
export { PlatformaticKafkaStatus } from "./types/platformatic-kafka.types";
