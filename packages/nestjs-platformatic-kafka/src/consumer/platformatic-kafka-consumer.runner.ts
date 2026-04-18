import { Inject, Injectable, Logger, OnApplicationShutdown } from "@nestjs/common";
import { Subject } from "rxjs";
import { ConsumerGroupJoinPayload } from "@platformatic/kafka";
import {
  DEFAULT_PLATFORMATIC_STREAM_CONSUME,
  DEFAULT_POSTFIX_SERVER,
  KAFKA_CONSUMER_MODULE_OPTIONS_TOKEN,
} from "../constants/platformatic-kafka.constants";
import { formatError, runWithBackoff, sleepMs } from "../utils/platformatic-kafka-reconnect";
import type {
  KafkaConsumer,
  KafkaProducer,
  KafkaSubscribeOptions,
  PlatformaticKafkaMessage,
  PlatformaticKafkaOptions,
} from "../types/platformatic-kafka.types";
import { PlatformaticKafkaStatus } from "../types/platformatic-kafka.types";
import {
  closeKafkaClients,
  createKafkaConsumer,
  createKafkaProducer,
  logPartitionAssignments,
  registerClientEventListeners,
  resolveKafkaGroupId,
  resolvePostfixId,
  SerialQueue,
} from "../utils/platformatic-kafka.utils";
import { KafkaMessageImpl, type KafkaMessage } from "./platformatic-kafka-consumer.message";

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
  private readonly partitionQueues = new Map<number, SerialQueue>();
  private readonly handlers = new Map<string, HandlerEntry>();
  private _consumer: KafkaConsumer | undefined;
  private _dlqProducer: KafkaProducer | null = null;
  private messagesStream: MessagesStream | null = null;
  private closed = false;
  private connecting = false;
  private currentStatus: PlatformaticKafkaStatus = PlatformaticKafkaStatus.DISCONNECTED;

  constructor(
    @Inject(KAFKA_CONSUMER_MODULE_OPTIONS_TOKEN)
    private readonly options: PlatformaticKafkaOptions,
  ) {
    this._status$.subscribe((s) => { this.currentStatus = s; });
  }

  public getStatus(): PlatformaticKafkaStatus {
    return this.currentStatus;
  }

  addHandler(topic: string, handler: HandlerFn, options?: KafkaSubscribeOptions): void {
    this.handlers.set(topic, { handler, options });
  }

  async start(): Promise<void> {
    if (!this.handlers.size) return;
    this.closed = false;
    await this.queue.enqueue(() => this.connectWithBackoff());
  }

  async onApplicationShutdown(): Promise<void> {
    this.closed = true;
    this.logPendingMetrics();
    await this.waitForQueues();
    await this.queue.enqueue(() => this.disposeConsumer());
  }

  public getQueueMetrics(): Record<number, number> {
    const result: Record<number, number> = {};
    for (const [partition, queue] of this.partitionQueues) {
      if (queue.pending > 0) result[partition] = queue.pending;
    }
    return result;
  }

  private logPendingMetrics(): void {
    const metrics = this.getQueueMetrics();
    const total = Object.values(metrics).reduce((s, n) => s + n, 0);
    if (total > 0) {
      this.logger.log(
        `Waiting for ${total} pending message(s) across ${Object.keys(metrics).length} partition(s)...`,
      );
    }
  }

  private async waitForQueues(): Promise<void> {
    const allIdle = Promise.all([
      ...[...this.partitionQueues.values()].map((q) => q.idle()),
      this.queue.idle(),
    ]);
    const timeout = this.options.shutdownTimeoutMs;
    if (!timeout) { await allIdle; return; }
    await Promise.race([
      allIdle,
      sleepMs(timeout).then(() =>
        this.logger.warn(`Shutdown timeout (${timeout}ms) exceeded, forcing close`),
      ),
    ]);
  }

  private getPartitionQueue(partition: number): SerialQueue {
    let q = this.partitionQueues.get(partition);
    if (!q) {
      q = new SerialQueue();
      this.partitionQueues.set(partition, q);
    }
    return q;
  }

  private async connectWithBackoff(): Promise<void> {
    this.connecting = true;
    const postfix = resolvePostfixId(this.options.postfixId, DEFAULT_POSTFIX_SERVER);
    const clientId = (this.options.clientId ?? "nestjs-consumer") + postfix;
    const groupId = resolveKafkaGroupId(this.options.groupId, "nestjs-group", postfix);
    try {
      await runWithBackoff(
        this.options.reconnect,
        () => this.closed,
        async () => {
          await this.disposeConsumer();
          this._consumer = createKafkaConsumer(this.options, clientId, groupId);
          registerClientEventListeners(this._consumer, this._status$, () =>
            this.scheduleReconnect(),
          );
          this._consumer.on("consumer:group:join", (data: ConsumerGroupJoinPayload) =>
            logPartitionAssignments(this.logger, groupId, data),
          );
          await this.attachStream();
          const topics = [...this.handlers.keys()].sort().join(", ");
          this.logger.log(
            `Kafka consumer ready — consumer group "${groupId}"${topics ? `, topics: ${topics}` : ""}`,
          );
        },
        (delay, err) => this.logger.warn(`Kafka unavailable, retry in ${delay}ms: ${formatError(err)}`),
      );
    } finally {
      this.connecting = false;
    }
  }

  private scheduleReconnect(): void {
    if (this.closed || this.connecting) return;
    void this.queue
      .enqueue(async () => {
        if (this.closed) return;
        this.logger.warn("Kafka consumer connection failure, reconnecting");
        await this.connectWithBackoff();
      })
      .catch((err: unknown) => this.logger.error(err));
  }

  private async attachStream(): Promise<void> {
    if (!this._consumer || !this.handlers.size) return;
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
      void this.getPartitionQueue(message.partition)
        .enqueue(() => this.processMessage(message))
        .catch((err: unknown) => this.logger.error(err));
    });
    stream.on("error", (error: Error) => {
      this.logger.error(error.message);
      this.scheduleReconnect();
    });
  }

  private async processMessage(payload: PlatformaticKafkaMessage): Promise<void> {
    const entry = this.handlers.get(payload.topic);
    if (!entry) return;

    const { handler, options } = entry;
    const autoAck = options?.autoAck !== false;
    const retryDelay = options?.retryDelay ?? 5000;
    const maxRetries = options?.maxRetries ?? Infinity;
    const deadLetterTopic = options?.deadLetterTopic;

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload.value);
    } catch {
      this.logger.warn(`Skipping invalid JSON on topic "${payload.topic}"`);
      return;
    }

    let failures = 0;
    while (!this.closed) {
      const msg = new KafkaMessageImpl(payload, parsed);
      let lastError: unknown = null;

      try {
        await handler(msg);
      } catch (err) {
        lastError = err;
        this.logger.error(`Handler error on "${payload.topic}":`, err);
      }

      if (lastError === null) {
        if (msg.nackDelay !== null) {
          failures++;
          if (failures > maxRetries) {
            await this.sendToDlq(payload, deadLetterTopic, "nack", failures);
            return;
          }
          this.logger.warn(
            `Nack on "${payload.topic}", retrying in ${msg.nackDelay}ms` +
            (isFinite(maxRetries) ? ` (${failures}/${maxRetries})` : ""),
          );
          await sleepMs(msg.nackDelay);
          continue;
        }
        if (!msg.wasAcked && autoAck) await msg.ack();
        return;
      }

      if (!autoAck) return;
      failures++;
      if (failures > maxRetries) {
        await this.sendToDlq(payload, deadLetterTopic, String(lastError), failures);
        return;
      }
      this.logger.warn(
        `Auto-retrying "${payload.topic}" in ${retryDelay}ms` +
        (isFinite(maxRetries) ? ` (${failures}/${maxRetries})` : ""),
      );
      await sleepMs(retryDelay);
    }
  }

  private async sendToDlq(
    payload: PlatformaticKafkaMessage,
    deadLetterTopic: string | undefined,
    error: string,
    failures: number,
  ): Promise<void> {
    if (!deadLetterTopic) {
      this.logger.warn(`Max retries exceeded on "${payload.topic}", dropping message (no DLQ configured)`);
      try { await (payload.commit() as Promise<void>); } catch {}
      return;
    }
    const producer = await this.getOrCreateDlqProducer();
    if (!producer) return;
    try {
      const headers = new Map<string, string>([
        ["x-dlq-original-topic", payload.topic],
        ["x-dlq-original-partition", String(payload.partition)],
        ["x-dlq-original-offset", String(payload.offset)],
        ["x-dlq-failures", String(failures)],
        ["x-dlq-error", error.slice(0, 500)],
      ]);
      for (const [k, v] of payload.headers) {
        if (!headers.has(k)) headers.set(k, v);
      }
      await producer.send({
        autocreateTopics: true,
        messages: [{ topic: deadLetterTopic, value: payload.value, key: payload.key ?? undefined, headers }],
      });
      this.logger.warn(`"${payload.topic}" → DLQ "${deadLetterTopic}" after ${failures} failure(s)`);
      try { await (payload.commit() as Promise<void>); } catch {}
    } catch (err) {
      this.logger.error(`Failed to send to DLQ "${deadLetterTopic}":`, err);
    }
  }

  private async getOrCreateDlqProducer(): Promise<KafkaProducer | null> {
    if (this._dlqProducer) return this._dlqProducer;
    const postfix = resolvePostfixId(this.options.postfixId, DEFAULT_POSTFIX_SERVER);
    const clientId = (this.options.clientId ?? "nestjs-consumer") + postfix + "-dlq";
    try {
      const producer = createKafkaProducer(this.options, clientId);
      await producer.metadata({ topics: [] });
      this._dlqProducer = producer;
      return producer;
    } catch (err) {
      this.logger.error("Failed to initialize DLQ producer:", err);
      return null;
    }
  }

  private async disposeConsumer(): Promise<void> {
    if (this.messagesStream) {
      try { await this.messagesStream.close(); } catch {}
      this.messagesStream = null;
    }
    this.partitionQueues.clear();
    await closeKafkaClients(this._consumer, this._dlqProducer, this.options.forceClose);
    this._consumer = undefined;
    this._dlqProducer = null;
  }
}
