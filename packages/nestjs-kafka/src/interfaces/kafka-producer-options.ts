import { KafkaJS } from "@confluentinc/kafka-javascript";

/** Configuration for creating a Kafka producer within KafkaModule. */
export interface KafkaProducerOptions {
  conf: KafkaJS.ProducerConstructorConfig;
  autoConnect?: boolean;
}
