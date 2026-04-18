import type {
  Broker,
  ConnectionOptions,
  ConsumeOptions,
  Consumer,
  ConsumerOptions,
  Message,
  ProduceOptions,
  Producer,
  ProducerOptions,
} from "@platformatic/kafka";

export type KafkaConsumer = Consumer<string, string, string, string>;
export type KafkaProducer = Producer<string, string, string, string>;

export type PlatformaticClientEvent =
  | "client:broker:connect"
  | "client:broker:disconnect"
  | "client:broker:failed"
  | "client:broker:drain";

export enum PlatformaticKafkaStatus {
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  FAILED = "failed",
}

export interface ReconnectConfig {
  initialDelayMs?: number;
  maxDelayMs?: number;
  multiplier?: number;
}

export interface PlatformaticKafkaOptions {
  brokers: string[] | Broker[];
  clientId?: string;
  groupId?: string;
  postfixId?: string;
  forceClose?: boolean;
  connection?: ConnectionOptions;
  consumer?: Partial<
    Omit<
      ConsumerOptions<string, string, string, string>,
      "clientId" | "bootstrapBrokers" | "groupId"
    >
  >;
  producer?: Partial<
    Omit<
      ProducerOptions<string, string, string, string>,
      "clientId" | "bootstrapBrokers" | "groupId"
    >
  >;
  consumeOptions?: Partial<ConsumeOptions<string, string, string, string>>;
  produceOptions?: ProduceOptions<string, string, string, string>;
  producerOnlyMode?: boolean;
  reconnect?: ReconnectConfig;
  /** Max number of retries before sending to DLQ (or dropping). Default: unlimited. */
  maxRetries?: number;
  /** Topic to send failed messages to after exhausting retries. */
  deadLetterTopic?: string;
  /** Timeout in ms to wait for in-flight messages during shutdown before force-closing. Default: unlimited. */
  shutdownTimeoutMs?: number;
  /** Enable idempotent producer for exactly-once delivery on retries. */
  idempotentProducer?: boolean;
}

export type PlatformaticKafkaMessage = Message<string, string, string, string>;

export type ParsedKafkaMessage = Omit<PlatformaticKafkaMessage, "value" | "key" | "headers"> & {
  value: object | string;
  key: object | string | null;
  headers: Map<string, object | string>;
};

export interface KafkaSubscribeOptions {
  /** Auto-ack on return, auto-retry on throw. Default: true. */
  autoAck?: boolean;
  /** Delay in ms before retry when autoAck is true and handler throws. Default: 5000. */
  retryDelay?: number;
  /** Max number of retries before sending to DLQ (or dropping). Default: unlimited. */
  maxRetries?: number;
  /** Topic to send failed messages to after exhausting retries. */
  deadLetterTopic?: string;
}

export interface KafkaSubscribeMetadata {
  topic: string;
  options?: KafkaSubscribeOptions;
}
