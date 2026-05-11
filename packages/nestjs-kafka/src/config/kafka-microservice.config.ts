import type { CustomStrategy } from "@nestjs/microservices";
import { KafkaStrategy } from "../strategy/kafka.strategy";
import type { KafkaOptions } from "../types/kafka.types";

/** Configuration passed to {@link createKafkaMicroservice}. */
export interface KafkaConnectConfig {
  options: KafkaOptions;
}

/** Creates a NestJS {@link CustomStrategy} backed by {@link KafkaStrategy}. */
export const createKafkaMicroservice = (
  config: KafkaConnectConfig,
): CustomStrategy => {
  return {
    strategy: new KafkaStrategy(config.options),
  };
};
