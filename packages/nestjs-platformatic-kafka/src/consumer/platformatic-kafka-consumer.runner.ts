import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from "@nestjs/common";
import { Subject } from "rxjs";
import { ConsumerGroupJoinPayload } from "@platformatic/kafka";
import {
  DEFAULT_PLATFORMATIC_STREAM_CONSUME,
  DEFAULT_POSTFIX_SERVER,
  KAFKA_CONSUMER_MODULE_OPTIONS_TOKEN,
} from "../constants/platformatic-kafka.constants";
import { getReconnectDelays, sleepMs } from "../utils/platformatic-kafka-reconnect";
import type {
  KafkaConsumer,
  KafkaSubscribeOptions,
  PlatformaticKafkaMessage,
  PlatformaticKafkaOptions,
} from "../types/platformatic-kafka.types";
import { PlatformaticKafkaStatus } from "../types/platformatic-kafka.types";
import {
  closeKafkaClients,
  createKafkaConsumer,
  registerClientEventListeners,
  resolveKafkaGroupId,
  resolvePostfixId,
  SerialQueue,
} from "../utils/platformatic-kafka.utils";
import {
  KafkaMessageImpl,
  type KafkaMessage,
} from "./platformatic-kafka-consumer.message";

type MessagesStream = Awaited<ReturnType<KafkaConsumer["consume"]>>;
type HandlerFn = (msg: KafkaMessage) => Promise<void>;

interface HandlerEntry {
  handler: HandlerFn;
  options?: KafkaSubscribeOptions;
}

@Injectable()
export class PlatformaticKafkaConsumerRunner implements OnApplicationShutdown {
  private readonly logger = new Logger(PlatformaticKafkaConsumerRunner.name);
  private readonly _status$ = new Subject<PlatformaticKafkaStatus>();
  private readonly queue = new SerialQueue();
  private readonly inboundMessageQueue = new SerialQueue();
  private readonly handlers = new Map<string, HandlerEntry>();

  private _consumer: KafkaConsumer | undefined;
  private messagesStream: MessagesStream | null = null;
  private closed = false;
  private activeConsumerGroupId = "";

  constructor(
    @Inject(KAFKA_CONSUMER_MODULE_OPTIONS_TOKEN)
    private readonly options: PlatformaticKafkaOptions,
  ) {}

  addHandler(
    topic: string,
    handler: HandlerFn,
    options?: KafkaSubscribeOptions,
  ): void {
    this.handlers.set(topic, { handler, options });
  }

  async start(): Promise<void> {
    if (this.handlers.size === 0) return;
    this.closed = false;
    await this.queue.enqueue(() => this.connectWithBackoff());
  }

  async onApplicationShutdown(): Promise<void> {
    this.closed = true;
    await Promise.all([this.inboundMessageQueue.idle(), this.queue.idle()]);
    await this.queue.enqueue(() => this.disposeConsumer());
  }

  private async connectWithBackoff(): Promise<void> {
    const delays = getReconnectDelays(this.options.reconnect ?? {});
    let delay = delays.initial;
    while (!this.closed) {
      try {
        await this.disposeConsumer();
        const postfix = resolvePostfixId(
          this.options.postfixId,
          DEFAULT_POSTFIX_SERVER,
        );
        const clientId = (this.options.clientId ?? "nestjs-consumer") + postfix;
        const groupId = resolveKafkaGroupId(
          this.options.groupId,
          "nestjs-group",
          postfix,
        );
        this.activeConsumerGroupId = groupId;
        this._consumer = createKafkaConsumer(this.options, clientId, groupId);
        registerClientEventListeners(this._consumer, this._status$, () =>
          this.scheduleReconnect(),
        );
        this._consumer.on(
          "consumer:group:join",
          (data: ConsumerGroupJoinPayload) => {
            this.logPartitionAssignments(data);
          },
        );
        await this.attachStream();
        const topics = [...this.handlers.keys()].sort().join(", ");
        this.logger.log(
          `Kafka consumer ready — consumer group "${this.activeConsumerGroupId}"${topics.length > 0 ? `, topics: ${topics}` : ""}`,
        );
        return;
      } catch (err) {
        if (this.closed) throw err;
        this.logger.warn(`Kafka unavailable, retry in ${delay}ms`);
        await sleepMs(delay);
        delay = Math.min(Math.floor(delay * delays.factor), delays.max);
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.closed) return;
    void this.queue
      .enqueue(async () => {
        if (this.closed) return;
        this.logger.warn("Kafka consumer connection failure, reconnecting");
        await this.connectWithBackoff();
      })
      .catch((err: unknown) => this.logger.error(err));
  }

  private async attachStream(): Promise<void> {
    if (!this._consumer || this.handlers.size === 0) return;
    const stream = await this._consumer.consume({
      autocommit: false,
      sessionTimeout: 10000,
      heartbeatInterval: 500,
      topics: [...this.handlers.keys()],
      ...DEFAULT_PLATFORMATIC_STREAM_CONSUME,
      ...this.options.consumeOptions,
    });
    this.messagesStream = stream;
    stream.on("data", (message: PlatformaticKafkaMessage) => {
      void this.inboundMessageQueue.enqueue(() => this.processMessage(message));
    });
    stream.on("error", (error: Error) => {
      this.logger.error(error.message);
      this.scheduleReconnect();
    });
  }

  private async processMessage(
    payload: PlatformaticKafkaMessage,
  ): Promise<void> {
    const entry = this.handlers.get(payload.topic);
    if (!entry) return;

    const { handler, options } = entry;
    const autoAck = options?.autoAck !== false;
    const retryDelay = options?.retryDelay ?? 5000;

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload.value);
    } catch {
      this.logger.warn(`Skipping invalid JSON on topic "${payload.topic}"`);
      return;
    }

    while (!this.closed) {
      const msg = new KafkaMessageImpl(payload, parsed);
      try {
        await handler(msg);
        if (msg.nackDelay !== null) {
          this.logger.warn(
            `Nack on topic "${payload.topic}", retrying in ${msg.nackDelay}ms`,
          );
          await sleepMs(msg.nackDelay);
          continue;
        }
        if (!msg.wasAcked && autoAck) {
          await msg.ack();
        }
        return;
      } catch (err) {
        this.logger.error(`Handler error on topic "${payload.topic}":`, err);
        if (!autoAck) return;
        this.logger.warn(
          `Auto-retrying topic "${payload.topic}" in ${retryDelay}ms`,
        );
        await sleepMs(retryDelay);
      }
    }
  }

  private async disposeConsumer(): Promise<void> {
    if (this.messagesStream) {
      try {
        await this.messagesStream.close();
      } catch {
        /* ignore */
      }
      this.messagesStream = null;
    }
    await closeKafkaClients(this._consumer, null, this.options.forceClose);
    this._consumer = undefined;
    this.activeConsumerGroupId = "";
  }

  private logPartitionAssignments(data: ConsumerGroupJoinPayload): void {
    const assignments = (data.assignments ?? []).filter(
      (a) => a.partitions.length > 0,
    );
    if (assignments.length === 0) return;
    const total = assignments.reduce((s, a) => s + a.partitions.length, 0);
    const w = Math.max(...assignments.map((a) => a.topic.length));
    const rows = assignments
      .map(
        (a) =>
          `  ${a.topic.padEnd(w)}  →  [${a.partitions.join(", ")}]  (${a.partitions.length})`,
      )
      .join("\n");
    this.logger.log(
      `Consumer group "${this.activeConsumerGroupId}" — assigned ${total} partition(s) across ${assignments.length} topic(s):\n${rows}`,
    );
  }
}
