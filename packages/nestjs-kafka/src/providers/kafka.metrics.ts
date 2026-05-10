import { KafkaJS } from "@confluentinc/kafka-javascript";

type KafkaTopicMetrics = Record<string, KafkaPartitionMetrics>;

type KafkaPartitionMetrics = Record<string, KafkaMetrics>;

/** Per-partition consumer lag and offset information. */
export interface KafkaMetrics {
  lag?: number;
  consumerOffset?: number;
  producerOffset?: number;
}

/** Service for collecting consumer lag and offset metrics via the Kafka admin client. */
export class KafkaMetricsService {
  constructor(
    private readonly admin?: KafkaJS.Admin,
    private readonly groupId?: string,
  ) {}

  async getMetrics(): Promise<KafkaTopicMetrics> {
    this.checkPrerequisites();

    const topicMetrics: KafkaTopicMetrics = {};

    try {
      const consumerOffsets = await this.admin!.fetchOffsets({
        groupId: this.groupId!,
      });
      this.populateConsumerOffsetForTopic(consumerOffsets, topicMetrics);

      const topics = consumerOffsets.map((o) => o.topic);

      for (const topic of topics) {
        if (!topicMetrics[topic]) {
          topicMetrics[topic] = {};
        }
        const producerOffset = await this.admin!.fetchTopicOffsets(topic);
        this.populateProducerOffsetForTopic(topic, producerOffset, topicMetrics);
      }

      this.evaluateLag(topicMetrics);
    } catch (e) {
      console.error("failed to collect metrics: %s", e);
    }

    return topicMetrics;
  }

  private evaluateLag(topicMetrics: KafkaTopicMetrics) {
    for (const [, partitions] of Object.entries(topicMetrics)) {
      for (const [, metrics] of Object.entries(partitions)) {
        const { consumerOffset, producerOffset } = metrics;

        if (consumerOffset !== undefined && producerOffset !== undefined) {
          metrics.lag = producerOffset - consumerOffset;
        }
      }
    }
  }

  private populateConsumerOffsetForTopic(
    consumerOffsets: Array<{
      topic: string;
      partitions: KafkaJS.FetchOffsetsPartition[];
    }>,
    topicMetrics: KafkaTopicMetrics
  ) {
    consumerOffsets.forEach((offset) => {
      if (!topicMetrics[offset.topic]) {
        topicMetrics[offset.topic] = {};
      }
      offset.partitions.forEach((partition) => {
        if (!topicMetrics[offset.topic][partition.partition]) {
          topicMetrics[offset.topic][partition.partition] = {};
        }
        topicMetrics[offset.topic][partition.partition].consumerOffset =
          Number.parseInt(partition.offset);
      });
    });
  }

  private populateProducerOffsetForTopic(
    topic: string,
    producerOffset: Array<KafkaJS.SeekEntry & { high: string; low: string }>,
    topicMetrics: KafkaTopicMetrics
  ) {
    producerOffset.forEach((offset) => {
      if (!topicMetrics[topic]) {
        topicMetrics[topic] = {};
      }
      if (!topicMetrics[topic][offset.partition]) {
        topicMetrics[topic][offset.partition] = {};
      }
      topicMetrics[topic][offset.partition].producerOffset = Number.parseInt(
        offset.offset
      );
    });
  }

  private checkPrerequisites(): void {
    if (!this.groupId) {
      throw new Error(
        "Consumer group id not provided."
      );
    }
    if (!this.admin) {
      throw new Error(
        "Admin client not provided. Did you forget to provide 'adminClient' configuration in KafkaModule?"
      );
    }
  }
}
