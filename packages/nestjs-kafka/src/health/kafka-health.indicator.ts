import { Injectable } from "@nestjs/common";
import type { KafkaStatus } from "../types/kafka.types";
import { KafkaStatus as Status } from "../types/kafka.types";

export interface KafkaHealthCheckable {
  getStatus(): KafkaStatus;
}

@Injectable()
export class KafkaHealthIndicator {
  async isHealthy(
    key: string,
    provider: KafkaHealthCheckable,
  ): Promise<{ [key: string]: { status: string } }> {
    const status = provider.getStatus();
    const healthy = status === Status.CONNECTED;
    const result = { [key]: { status } };

    if (!healthy) {
      throw Object.assign(
        new Error(`Kafka "${key}" is ${status}`),
        { causes: result },
      );
    }

    return result;
  }
}
