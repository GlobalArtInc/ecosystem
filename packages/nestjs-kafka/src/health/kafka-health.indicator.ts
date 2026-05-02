import { Injectable } from "@nestjs/common";
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from "@nestjs/terminus";
import { KafkaStatus } from "../types/kafka.types";

export interface KafkaHealthCheckable {
  getStatus(): KafkaStatus;
}

/**
 * Health indicator for Kafka connections. Requires `@nestjs/terminus` to be installed.
 *
 * @example
 * ```ts
 * @Get('health')
 * @HealthCheck()
 * check() {
 *   return this.health.check([
 *     () => this.kafkaHealth.isHealthy('kafka', this.kafkaStrategy),
 *   ]);
 * }
 * ```
 */
@Injectable()
export class KafkaHealthIndicator extends HealthIndicator {
  async isHealthy(key: string, provider: KafkaHealthCheckable): Promise<HealthIndicatorResult> {
    const status = provider.getStatus();
    const healthy = status === KafkaStatus.CONNECTED;
    const result = this.getStatus(key, healthy, { status });
    if (!healthy) throw new HealthCheckError(`Kafka "${key}" is ${status}`, result);
    return result;
  }
}
