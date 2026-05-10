import { KafkaJS } from "@confluentinc/kafka-javascript";

/** Configuration for creating a Kafka consumer within KafkaModule. */
export interface KafkaConsumerOptions {
  conf: KafkaJS.ConsumerConstructorConfig;
  autoConnect?: boolean;
}
