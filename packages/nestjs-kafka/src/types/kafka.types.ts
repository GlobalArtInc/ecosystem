import type { KafkaJS } from "@confluentinc/kafka-javascript";
import type { KafkaConsumerRdKafkaConfig, KafkaProducerRdKafkaConfig, KafkaRdKafkaConfig } from "../utils/rdkafka-config";

/** KafkaJS consumer instance. */
export type KafkaConsumer = KafkaJS.Consumer;
/** KafkaJS producer instance. */
export type KafkaProducer = KafkaJS.Producer;
/** A single Kafka message as provided by KafkaJS. */
export type KafkaMessage = KafkaJS.KafkaMessage;
/** Normalised Kafka headers as a string-to-string map. */
export type KafkaHeaders = Map<string, string>;
/** Function that commits the current message offset. */
export type KafkaAck = () => Promise<void>;
/** Function that triggers a retry, optionally after a delay. */
export type KafkaNack = (delayMs?: number) => void;
/** Possible shapes for a Kafka message key. */
export type KafkaKey = Record<string, unknown> | string | null;

export type { KafkaRdKafkaConfig, KafkaConsumerRdKafkaConfig, KafkaProducerRdKafkaConfig };

/** Lifecycle status of a Kafka transport or client. */
export enum KafkaStatus {
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  FAILED = "failed",
}

/** Options passed to the KafkaJS-based strategy and client. */
export interface KafkaOptions {
  brokers: string[];
  clientId?: string;
  groupId: string;
  /** Suffix appended to clientId and groupId. Defaults to "-server" in KafkaStrategy and "-client" in KafkaClient. */
  postfixId?: string;
  ssl?: boolean;
  sasl?: KafkaJS.SASLOptions;
  consumer?: Partial<KafkaJS.ConsumerConfig>;
  consumerRdKafka?: KafkaConsumerRdKafkaConfig;
  producer?: Partial<KafkaJS.ProducerConfig>;
  producerRdKafka?: KafkaProducerRdKafkaConfig;
  rdKafka?: KafkaRdKafkaConfig;
  producerOnlyMode?: boolean;
  maxRetries?: number;
  deadLetterTopic?: string;
  shutdownTimeoutMs?: number;
}

/** A Kafka message with its key and value already deserialised. */
export interface ParsedKafkaMessage {
  key: unknown;
  value: unknown;
  offset: string;
  timestamp: string;
  headers: Map<string, string>;
}
