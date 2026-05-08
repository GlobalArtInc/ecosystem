import type { KafkaJS } from "@confluentinc/kafka-javascript";

export type KafkaConsumer = KafkaJS.Consumer;
export type KafkaProducer = KafkaJS.Producer;
export type KafkaMessage = KafkaJS.KafkaMessage;
export type KafkaHeaders = KafkaJS.IHeaders;

export enum KafkaStatus {
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  FAILED = "failed",
}

export interface KafkaSslOptions {
  caLocation?: string;
  caPem?: string;
  certLocation?: string;
  certPem?: string;
  keyLocation?: string;
  keyPem?: string;
  keyPassword?: string;
}

export interface KafkaOptions {
  brokers: string[];
  clientId?: string;
  groupId: string;
  /** Suffix appended to clientId and groupId. Defaults to "-server" in KafkaStrategy and "-client" in KafkaClient. */
  postfixId?: string;
  ssl?: boolean | KafkaSslOptions;
  sasl?: KafkaJS.SASLOptions;
  consumer?: Partial<KafkaJS.ConsumerConfig>;
  producer?: Partial<KafkaJS.ProducerConfig>;
  producerOnlyMode?: boolean;
  maxRetries?: number;
  deadLetterTopic?: string;
  shutdownTimeoutMs?: number;
}

export interface ParsedKafkaMessage {
  key: unknown;
  value: unknown;
  offset: string;
  timestamp: string;
  headers: Map<string, string>;
}

export interface KafkaSubscribeOptions {
  retryDelay?: number;
  maxRetries?: number;
  deadLetterTopic?: string;
}

export interface KafkaSubscribeMetadata {
  topic: string;
  options?: KafkaSubscribeOptions;
}
