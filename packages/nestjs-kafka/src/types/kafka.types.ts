import type { KafkaJS } from "@confluentinc/kafka-javascript";
import type {
  KafkaConsumerRdKafkaConfig,
  KafkaProducerRdKafkaConfig,
  KafkaRdKafkaConfig,
} from "../utils/rdkafka-config";
import type {
  KafkaDeserializer,
  KafkaSerializer,
} from "../serde/kafka-serde.interface";

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

export type {
  KafkaRdKafkaConfig,
  KafkaConsumerRdKafkaConfig,
  KafkaProducerRdKafkaConfig,
};

/** Lifecycle status of a Kafka transport or client. */
export enum KafkaStatus {
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  FAILED = "failed",
}

/** Retry with a constant delay between attempts. */
export interface FixedRetryStrategy {
  type: "fixed";
  /** Delay between retries in ms. Defaults to 5000. */
  delayMs?: number;
  /** Maximum number of retries before sending to DLQ. Defaults to Infinity. */
  maxRetries?: number;
}

/** Retry with exponentially increasing delays, with an optional jitter. */
export interface ExponentialRetryStrategy {
  type: "exponential";
  /** Initial delay in ms. Defaults to 1000. */
  initialDelayMs?: number;
  /** Multiplier applied to the delay on each attempt. Defaults to 2. */
  multiplier?: number;
  /** Upper bound for the computed delay in ms. Defaults to 30000. */
  maxDelayMs?: number;
  /** When true, applies full jitter (uniform random between 0 and computed delay). */
  jitter?: boolean;
  /** Maximum number of retries before sending to DLQ. Defaults to Infinity. */
  maxRetries?: number;
}

/** Configures how failed messages are retried before going to the DLQ. */
export type KafkaRetryStrategy = FixedRetryStrategy | ExponentialRetryStrategy;

/** Map of Kafka topic names to their event payload types. Used to type `KafkaClient<T>`. */
export type KafkaTopicMap = Record<string, unknown>;

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
  /** Retry strategy for failed messages. Defaults to fixed 5000 ms delay with infinite retries. */
  retryStrategy?: KafkaRetryStrategy;
  deadLetterTopic?: string;
  shutdownTimeoutMs?: number;
  /** When set, auto-creates subscribed topics before the consumer starts. Pass {} for defaults or specify numPartitions/replicationFactor. */
  autoCreateTopics?: Omit<KafkaJS.ITopicConfig, 'topic'>;
  /** When true, consumer runs in eachBatch mode instead of eachMessage. */
  batchMode?: boolean;
  /** Options forwarded to consumer.run() — excludes eachMessage/eachBatch which are managed internally. */
  consumerRun?: Omit<KafkaJS.ConsumerRunConfig, 'eachMessage' | 'eachBatch'>;
  /** Custom serializer for outgoing message values. Defaults to JSON. */
  serializer?: KafkaSerializer;
  /** Custom deserializer for incoming message values. Defaults to JSON. */
  deserializer?: KafkaDeserializer;
}

/**
 * Structured payload for `emit()` calls.
 * Use `value` to send one message or `values` to fan-out into multiple messages
 * that all share the same `key` and `headers`.
 */
export interface KafkaEmitPayload<T = unknown> {
  /** Message key, shared by all produced messages. */
  key?: Buffer | string | null;
  /** Target partition, shared by all produced messages. */
  partition?: number;
  /** Single message value. */
  value?: T;
  /** Multiple message values — one Kafka message is produced per element. */
  values?: T[];
  /** Headers attached to every produced message. */
  headers?: KafkaJS.IHeaders;
}

/** A Kafka message with its key and value already deserialised. */
export interface ParsedKafkaMessage {
  key: unknown;
  value: unknown;
  offset: string;
  timestamp: string;
  headers: Map<string, string>;
}

export type NackState = null | number | "auto";
