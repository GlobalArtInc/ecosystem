import { KafkaJS } from "@confluentinc/kafka-javascript";

/** Configuration for creating a Kafka admin client within KafkaModule. */
export interface KafkaAdminClientOptions {
  autoConnect?: boolean;
  conf: KafkaJS.AdminConstructorConfig;
}
