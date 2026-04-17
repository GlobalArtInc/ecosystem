import type { CustomStrategy } from "@nestjs/microservices";
import { Transport } from "@nestjs/microservices";
import { PlatformaticKafkaStrategy } from "../strategy/platformatic-kafka.strategy";
import type { PlatformaticKafkaOptions } from "../types/platformatic-kafka.types";

export interface PlatformaticKafkaConnectConfig {
  transport: Transport.KAFKA;
  options: PlatformaticKafkaOptions;
}

export function createPlatformaticKafkaMicroservice(
  config: PlatformaticKafkaConnectConfig,
): CustomStrategy {
  return {
    strategy: new PlatformaticKafkaStrategy(config.options),
  };
}
