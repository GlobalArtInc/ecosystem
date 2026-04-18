import type { CustomClientOptions } from "@nestjs/microservices";
import { ConfluentKafkaClient } from "../client/confluent-kafka.client";
import type { ConfluentKafkaOptions } from "../types/confluent-kafka.types";

export function createConfluentKafkaClientBroker(
  options: ConfluentKafkaOptions,
): CustomClientOptions {
  return {
    customClass: ConfluentKafkaClient,
    options,
  } as CustomClientOptions;
}
