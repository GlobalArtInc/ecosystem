import { Inject, Injectable, Logger, OnApplicationShutdown } from "@nestjs/common";
import { Subject } from "rxjs";
import {
  DEFAULT_POSTFIX_SERVER,
  KAFKA_CONSUMER_MODULE_OPTIONS_TOKEN,
} from "../constants/confluent-kafka.constants";
import { formatError, runWithBackoff, sleepMs } from "../utils/confluent-kafka-reconnect";
import type {
  ConfluentKafkaConsumer,
  ConfluentKafkaMessage,
  ConfluentKafkaOptions,
  ConfluentKafkaProducer,
  KafkaSubscribeOptions,
} from "../types/confluent-kafka.types";
import { ConfluentKafkaStatus } from "../types/confluent-kafka.types";
import {
  buildDlqHeaders,
  commitOffset,
  createKafkaConsumer,
  createKafkaInstance,
  createKafkaProducer,
  disconnectKafkaClients,
  emitConnected,
  emitDisconnected,
  emitFailed,
  headersToMap,
  mapToHeaders,
  resolveDefaultClientAndGroup,
  SerialQueue,
} from "../utils/confluent-kafka.utils";
import { KafkaMessageImpl, type KafkaMessage } from "./confluent-kafka-consumer.message";

type HandlerFn = (msg: KafkaMessage) => Promise<void>;

interface HandlerEntry {
  handler: HandlerFn;
  options?: KafkaSubscribeOptions;
}

@Injectable()
export class ConfluentKafkaConsumerRunner implements OnApplicationShutdown {
  private readonly logger = new Logger(ConfluentKafkaConsumerRunner.name);
  private readonly _status$ = new Subject<ConfluentKafkaStatus>();
  private readonly queue = new SerialQueue();
  private readonly handlers = new Map<string, HandlerEntry>();
  private _consumer: ConfluentKafkaConsumer | undefined;
  private _dlqProducer: ConfluentKafkaProducer | null = null;
  private closed = false;
  private connecting = false;
  private currentStatus: ConfluentKafkaStatus = ConfluentKafkaStatus.DISCONNECTED;

  constructor(
    @Inject(KAFKA_CONSUMER_MODULE_OPTIONS_TOKEN)
    private readonly options: ConfluentKafkaOptions,
  ) {
    this._status$.subscribe((s) => { this.currentStatus = s; });
  }

  public getStatus(): ConfluentKafkaStatus {
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
    await this.queue.enqueue(() => this.disposeConsumer());
  }

  private async connectWithBackoff(): Promise<void> {
    this.connecting = true;
    const { clientId, groupId } = resolveDefaultClientAndGroup(this.options, DEFAULT_POSTFIX_SERVER);
    try {
      await runWithBackoff(
        this.options.reconnect,
        () => this.closed,
        async () => {
          await this.disposeConsumer();
          const kafka = createKafkaInstance(this.options, clientId);
          this._consumer = createKafkaConsumer(kafka, this.options, groupId);
          await this._consumer.connect();
          emitConnected(this._status$);
          await this.attachStream(groupId);
          const topics = [...this.handlers.keys()].sort().join(", ");
          this.logger.log(
            `Confluent Kafka consumer ready — group "${groupId}"${topics ? `, topics: ${topics}` : ""}`,
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
        this.logger.warn("Confluent Kafka consumer connection failure, reconnecting");
        await this.connectWithBackoff();
      })
      .catch((err: unknown) => this.logger.error(err));
  }

  private async attachStream(groupId: string): Promise<void> {
    if (!this._consumer || !this.handlers.size) return;

    await this._consumer.subscribe({ topics: [...this.handlers.keys()] });

    const concurrency = this.options.consumeOptions?.partitionsConsumedConcurrently ?? 1;

    this._consumer.run({
      autoCommit: false,
      partitionsConsumedConcurrently: concurrency,
      eachMessage: async ({ topic, partition, message, heartbeat }) => {
        if (this.closed) return;
        const headers = headersToMap(message.headers as Record<string, Buffer | string | null | undefined>);
        const msg: ConfluentKafkaMessage = {
          topic,
          partition,
          offset: message.offset,
          key: message.key != null ? message.key.toString() : null,
          value: message.value != null ? message.value.toString() : "null",
          headers,
          commit: () => commitOffset(this._consumer!, topic, partition, message.offset),
          heartbeat,
        };
        await this.processMessage(msg);
      },
    }).catch((err: unknown) => {
      emitFailed(this._status$);
      this.logger.error(`Consumer run error (group "${groupId}"): ${formatError(err)}`);
      this.scheduleReconnect();
    });
  }

  private async processMessage(payload: ConfluentKafkaMessage): Promise<void> {
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
      await payload.commit().catch(() => undefined);
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
          await this.sleepWithHeartbeat(msg.nackDelay, payload.heartbeat);
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
      await this.sleepWithHeartbeat(retryDelay, payload.heartbeat);
    }
  }

  private async sendToDlq(
    payload: ConfluentKafkaMessage,
    deadLetterTopic: string | undefined,
    error: string,
    failures: number,
  ): Promise<void> {
    if (!deadLetterTopic) {
      this.logger.warn(`Max retries exceeded on "${payload.topic}", dropping message (no DLQ configured)`);
      await payload.commit().catch(() => undefined);
      return;
    }
    const producer = await this.getOrCreateDlqProducer();
    if (!producer) return;
    try {
      const headers = buildDlqHeaders(payload, error, failures);
      await producer.send({
        topic: deadLetterTopic,
        messages: [{
          value: payload.value,
          ...(payload.key !== null ? { key: payload.key } : {}),
          headers: mapToHeaders(new Map(Object.entries(headers))),
        }],
      });
      this.logger.warn(`"${payload.topic}" → DLQ "${deadLetterTopic}" after ${failures} failure(s)`);
      await payload.commit().catch(() => undefined);
    } catch (err) {
      this.logger.error(`Failed to send to DLQ "${deadLetterTopic}":`, err);
    }
  }

  private async getOrCreateDlqProducer(): Promise<ConfluentKafkaProducer | null> {
    if (this._dlqProducer) return this._dlqProducer;
    const { clientId } = resolveDefaultClientAndGroup(this.options, DEFAULT_POSTFIX_SERVER);
    try {
      const kafka = createKafkaInstance(this.options, `${clientId}-dlq`);
      const producer = createKafkaProducer(kafka, this.options);
      await producer.connect();
      this._dlqProducer = producer;
      return producer;
    } catch (err) {
      this.logger.error("Failed to initialize DLQ producer:", err);
      return null;
    }
  }

  private async sleepWithHeartbeat(ms: number, heartbeat: () => Promise<void>): Promise<void> {
    const interval = 2000;
    let remaining = ms;
    while (remaining > 0) {
      await sleepMs(Math.min(interval, remaining));
      remaining -= interval;
      try { await heartbeat(); } catch {}
    }
  }

  private async disposeConsumer(): Promise<void> {
    await disconnectKafkaClients(this._consumer, this._dlqProducer);
    this._consumer = undefined;
    this._dlqProducer = null;
    emitDisconnected(this._status$);
  }
}
