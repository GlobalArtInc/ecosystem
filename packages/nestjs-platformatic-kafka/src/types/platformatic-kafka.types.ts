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
  consumer?: Omit<
    ConsumerOptions<string, string, string, string>,
    "clientId" | "bootstrapBrokers"
  >;
  producer?: Omit<
    ProducerOptions<string, string, string, string>,
    "clientId" | "bootstrapBrokers" | "groupId"
  >;
  consumeOptions?: Partial<ConsumeOptions<string, string, string, string>>;
  produceOptions?: ProduceOptions<string, string, string, string>;
  producerOnlyMode?: boolean;
  reconnect?: ReconnectConfig;
}

export type PlatformaticKafkaMessage = Message<string, string, string, string>;

export interface KafkaSubscribeOptions {
  /** Auto-ack on return, auto-retry on throw. Default: true. */
  autoAck?: boolean;
  /** Delay in ms before retry when autoAck is true and handler throws. Default: 5000. */
  retryDelay?: number;
}

export interface KafkaSubscribeMetadata {
  topic: string;
  options?: KafkaSubscribeOptions;
}
