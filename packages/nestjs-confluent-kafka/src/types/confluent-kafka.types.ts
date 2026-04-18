import type { Kafka, SASLOptions } from "@confluentinc/kafka-javascript";

export type ConfluentKafkaProducer = ReturnType<Kafka["producer"]>;
export type ConfluentKafkaConsumer = ReturnType<Kafka["consumer"]>;

export enum ConfluentKafkaStatus {
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  FAILED = "failed",
}

export interface ReconnectConfig {
  initialDelayMs?: number;
  maxDelayMs?: number;
  multiplier?: number;
}

export interface ConfluentKafkaMessage {
  topic: string;
  partition: number;
  offset: string;
  key: string | null;
  value: string;
  headers: Map<string, string>;
  commit(): Promise<void>;
  heartbeat(): Promise<void>;
}

export interface ConfluentKafkaSslOptions {
  rejectUnauthorized?: boolean;
  ca?: string | string[];
  cert?: string;
  key?: string;
  passphrase?: string;
}

export interface ConfluentKafkaProducerConfig {
  allowAutoTopicCreation?: boolean;
  idempotent?: boolean;
  maxInFlightRequests?: number;
  metadataMaxAge?: number;
  transactionalId?: string;
  transactionTimeout?: number;
}

export interface ConfluentKafkaConsumerConfig {
  sessionTimeout?: number;
  rebalanceTimeout?: number;
  heartbeatInterval?: number;
  maxBytesPerPartition?: number;
  minBytes?: number;
  maxBytes?: number;
  maxWaitTimeInMs?: number;
  allowAutoTopicCreation?: boolean;
  maxInFlightRequests?: number;
  metadataMaxAge?: number;
  readUncommitted?: boolean;
}

export interface ConfluentKafkaConsumeOptions {
  partitionsConsumedConcurrently?: number;
  autoCommit?: boolean;
  autoCommitInterval?: number;
  autoCommitThreshold?: number;
}

export interface ConfluentKafkaOptions {
  brokers: string[];
  clientId?: string;
  groupId?: string;
  postfixId?: string;
  ssl?: boolean | ConfluentKafkaSslOptions;
  sasl?: SASLOptions;
  connectionTimeout?: number;
  requestTimeout?: number;
  consumer?: ConfluentKafkaConsumerConfig;
  producer?: ConfluentKafkaProducerConfig;
  consumeOptions?: ConfluentKafkaConsumeOptions;
  producerOnlyMode?: boolean;
  reconnect?: ReconnectConfig;
  maxRetries?: number;
  deadLetterTopic?: string;
  shutdownTimeoutMs?: number;
}

export interface KafkaSubscribeOptions {
  autoAck?: boolean;
  retryDelay?: number;
  maxRetries?: number;
  deadLetterTopic?: string;
}

export interface KafkaSubscribeMetadata {
  topic: string;
  options?: KafkaSubscribeOptions;
}

export type ParsedConfluentKafkaMessage = Omit<ConfluentKafkaMessage, "value" | "key" | "headers"> & {
  value: object | string;
  key: object | string | null;
  headers: Map<string, object | string>;
};
