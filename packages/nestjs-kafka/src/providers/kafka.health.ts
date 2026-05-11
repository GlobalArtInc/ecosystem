import { KafkaJS } from "@confluentinc/kafka-javascript";
import { HealthIndicatorService } from "@nestjs/terminus";

/** Health indicator that checks connectivity via the Kafka admin client. */
export class KafkaHealthIndicator {
  constructor(
    private readonly healthIndicatorService?: HealthIndicatorService,
    private readonly adminClient?: KafkaJS.Admin,
  ) {}

  async isHealty() {
    if (!this.healthIndicatorService) {
      throw new Error(
        "Kafka admin client not provided. Did you forget to inject TerminusModule?",
      );
    }

    if (!this.adminClient) {
      throw new Error(
        "Kafka admin client not provided. Did you forget to provide 'adminClient' configuration in KafkaModule?",
      );
    }

    const indicator = this.healthIndicatorService.check("kafka");
    try {
      await this.adminClient.fetchTopicMetadata();
      return indicator.up();
    } catch (error) {
      return indicator.down();
    }
  }
}
