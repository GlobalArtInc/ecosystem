import { Injectable } from "@nestjs/common";
import type { KafkaStatus } from "../types/kafka.types";
import { KafkaStatus as Status } from "../types/kafka.types";

/** Any Kafka transport or client that can report its current status. */
export interface KafkaHealthCheckable {
  getStatus(): KafkaStatus;
}

@Injectable()
/** NestJS health indicator that checks Kafka transport status. */
export class KafkaHealthIndicator {
  async isHealthy(
    kafkaKey: string,
    provider: KafkaHealthCheckable,
  ): Promise<{ [key: string]: { status: string } }> {
    const status = provider.getStatus();
    const healthy = status === Status.CONNECTED;
    const result = { [kafkaKey]: { status } };

    if (!healthy) {
      throw Object.assign(new Error(`Kafka "${kafkaKey}" is ${status}`), {
        causes: result,
      });
    }

    return result;
  }
}
