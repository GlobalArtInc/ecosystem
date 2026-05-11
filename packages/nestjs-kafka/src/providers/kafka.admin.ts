import { Injectable } from "@nestjs/common";
import { KafkaJS } from "@confluentinc/kafka-javascript";

type FetchConsumerOffsetsOptions = {
  timeout?: number;
  requireStableOffsets?: boolean;
};

/** Injectable service for Kafka admin operations: topic management, offset inspection, and group control. */
@Injectable()
export class KafkaAdminService {
  constructor(private readonly admin?: KafkaJS.Admin) {}

  private getAdmin(): KafkaJS.Admin {
    if (!this.admin) {
      throw new Error(
        "Kafka admin client not configured. Add 'adminClient' to KafkaModule configuration.",
      );
    }
    return this.admin;
  }

  /** Lists all topic names available in the cluster. */
  listTopics(options?: { timeout?: number }): Promise<string[]> {
    return this.getAdmin().listTopics(options);
  }

  /** Creates one or more topics. Returns true if topics were created. */
  createTopics(
    topics: KafkaJS.ITopicConfig[],
    options?: {
      validateOnly?: boolean;
      waitForLeaders?: boolean;
      timeout?: number;
    },
  ): Promise<boolean> {
    return this.getAdmin().createTopics({ topics, ...options });
  }

  /** Deletes one or more topics by name. */
  deleteTopics(
    topics: string[],
    options?: { timeout?: number },
  ): Promise<void> {
    return this.getAdmin().deleteTopics({ topics, ...options });
  }

  /** Returns metadata for the given topics (or all topics if none specified). */
  async fetchTopicMetadata(options?: {
    topics?: string[];
    includeAuthorizedOperations?: boolean;
    timeout?: number;
  }): Promise<KafkaJS.ITopicMetadata[]> {
    const result = await this.getAdmin().fetchTopicMetadata(options);
    return result.topics;
  }

  /** Returns the current high/low watermark offsets for each partition of the given topic. */
  fetchTopicOffsets(
    topic: string,
    options?: { timeout?: number; isolationLevel: KafkaJS.IsolationLevel },
  ): Promise<Array<KafkaJS.SeekEntry & { high: string; low: string }>> {
    return this.getAdmin().fetchTopicOffsets(topic, options);
  }

  /** Returns offsets for each partition at the given timestamp. */
  fetchTopicOffsetsByTimestamp(
    topic: string,
    timestamp?: number,
    options?: { timeout?: number; isolationLevel: KafkaJS.IsolationLevel },
  ): Promise<KafkaJS.SeekEntry[]> {
    return this.getAdmin().fetchTopicOffsetsByTimestamp(
      topic,
      timestamp,
      options,
    );
  }

  /** Returns the committed consumer offsets for a group, optionally filtered by topics. */
  fetchConsumerOffsets(
    groupId: string,
    topics?: string[],
    options?: FetchConsumerOffsetsOptions,
  ): Promise<
    Array<{ topic: string; partitions: KafkaJS.FetchOffsetsPartition[] }>
  > {
    return this.getAdmin().fetchOffsets({
      groupId,
      topics,
      ...options,
    });
  }

  /** Deletes records from topic partitions up to the given offsets. */
  deleteTopicRecords(options: {
    topic: string;
    partitions: KafkaJS.SeekEntry[];
    timeout?: number;
    operationTimeout?: number;
  }): Promise<KafkaJS.DeleteRecordsResult[]> {
    return this.getAdmin().deleteTopicRecords(options);
  }

  /** Lists all consumer groups in the cluster. */
  listGroups(options?: {
    timeout?: number;
    matchConsumerGroupStates?: KafkaJS.ConsumerGroupStates[];
    matchConsumerGroupTypes?: KafkaJS.ConsumerGroupTypes[];
  }): Promise<{
    groups: KafkaJS.GroupOverview[];
    errors: KafkaJS.LibrdKafkaError[];
  }> {
    return this.getAdmin().listGroups(options);
  }

  /** Returns detailed information about the specified consumer groups. */
  describeGroups(
    groups: string[],
    options?: { timeout?: number; includeAuthorizedOperations?: boolean },
  ): Promise<KafkaJS.GroupDescriptions> {
    return this.getAdmin().describeGroups(groups, options);
  }

  /** Deletes the specified consumer groups. */
  deleteGroups(
    groupIds: string[],
    options?: { timeout?: number },
  ): Promise<KafkaJS.DeleteGroupsResult[]> {
    return this.getAdmin().deleteGroups(groupIds, options);
  }
}
