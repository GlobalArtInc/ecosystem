import { Injectable } from "@nestjs/common";
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from "@nestjs/terminus";
import { ConfluentKafkaStatus } from "../types/confluent-kafka.types";

export interface KafkaHealthCheckable {
  getStatus(): ConfluentKafkaStatus;
}

@Injectable()
export class ConfluentKafkaHealthIndicator extends HealthIndicator {
  async isHealthy(key: string, provider: KafkaHealthCheckable): Promise<HealthIndicatorResult> {
    const status = provider.getStatus();
    const healthy = status === ConfluentKafkaStatus.CONNECTED;
    const result = this.getStatus(key, healthy, { status });
    if (!healthy) throw new HealthCheckError(`Kafka "${key}" is ${status}`, result);
    return result;
  }
}
