import type { CustomStrategy } from "@nestjs/microservices";
import { Transport } from "@nestjs/microservices";
import { ConfluentKafkaStrategy } from "../strategy/confluent-kafka.strategy";
import type { ConfluentKafkaOptions } from "../types/confluent-kafka.types";

export interface ConfluentKafkaConnectConfig {
  transport: Transport.KAFKA;
  options: ConfluentKafkaOptions;
}

export function createConfluentKafkaMicroservice(
  config: ConfluentKafkaConnectConfig,
): CustomStrategy {
  return {
    strategy: new ConfluentKafkaStrategy(config.options),
  };
}
