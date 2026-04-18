import type { CustomClientOptions } from "@nestjs/microservices";
import { PlatformaticKafkaClient } from "../client/platformatic-kafka.client";
import type { PlatformaticKafkaOptions } from "../types/platformatic-kafka.types";

export function createPlatformaticKafkaClientBroker(
  options: PlatformaticKafkaOptions,
): CustomClientOptions {
  return {
    customClass: PlatformaticKafkaClient,
    options,
  } as CustomClientOptions;
}
