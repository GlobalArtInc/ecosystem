import type { CustomClientOptions } from "@nestjs/microservices";
import { KafkaClient } from "../client/kafka.client";
import type { KafkaOptions } from "../types/kafka.types";

/** Creates a custom client options object for use with `ClientsModule.register`. */
export function createKafkaClientBroker(
  options: KafkaOptions,
): CustomClientOptions {
  return {
    customClass: KafkaClient as CustomClientOptions["customClass"],
    options,
  };
}
