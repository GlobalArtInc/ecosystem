import type { CustomStrategy } from "@nestjs/microservices";
import { Transport } from "@nestjs/microservices";
import { KafkaStrategy } from "../strategy/kafka.strategy";
import type { KafkaOptions } from "../types/kafka.types";

export interface KafkaConnectConfig {
  transport: Transport.KAFKA;
  options: KafkaOptions;
}

export function createKafkaMicroservice(
  config: KafkaConnectConfig,
): CustomStrategy {
  return {
    strategy: new KafkaStrategy(config.options),
  };
}
