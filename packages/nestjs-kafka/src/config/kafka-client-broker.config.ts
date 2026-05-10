import type { CustomClientOptions } from "@nestjs/microservices";
import { KafkaClient } from "../client/kafka.client";
import type { KafkaOptions } from "../types/kafka.types";

/** Creates a {@link CustomClientOptions} object that wires up {@link KafkaClient} as the transport. */
export function createKafkaClientBroker(options: KafkaOptions): CustomClientOptions {
  return {
    customClass: KafkaClient as CustomClientOptions["customClass"],
    options,
  };
}
