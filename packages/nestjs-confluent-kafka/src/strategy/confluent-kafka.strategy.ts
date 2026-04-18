import { Logger } from "@nestjs/common";
import {
  CustomTransportStrategy,
  KafkaHeaders,
  KafkaRetriableException,
  Server,
  Transport,
  WritePacket,
} from "@nestjs/microservices";
import { NO_EVENT_HANDLER, NO_MESSAGE_HANDLER } from "@nestjs/microservices/constants";
import { firstValueFrom, isObservable, Observable, ReplaySubject } from "rxjs";
import { DEFAULT_POSTFIX_SERVER } from "../constants/confluent-kafka.constants";
import { formatError, runWithBackoff, sleepMs } from "../utils/confluent-kafka-reconnect";
import { ConfluentKafkaContext } from "../context/confluent-kafka.context";
import type {
  ConfluentKafkaConsumer,
  ConfluentKafkaMessage,
  ConfluentKafkaOptions,
  ConfluentKafkaProducer,
  ConfluentKafkaStatus,
} from "../types/confluent-kafka.types";
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
  logPartitionAssignments,
  mapToHeaders,
  resolveDefaultClientAndGroup,
  SerialQueue,
} from "../utils/confluent-kafka.utils";

export class ConfluentKafkaStrategy
  extends Server<never, ConfluentKafkaStatus>
  implements CustomTransportStrategy
{
  transportId = Transport.KAFKA;
  protected readonly logger = new Logger(ConfluentKafkaStrategy.name);
  private readonly clientId: string;
  private readonly groupId: string;
  private _consumer: ConfluentKafkaConsumer | undefined;
  private _producer: ConfluentKafkaProducer | undefined;
  private closed = false;
  private connecting = false;
  private currentStatus: ConfluentKafkaStatus;
  private readonly queue = new SerialQueue();

  get consumer(): ConfluentKafkaConsumer {
    if (!this._consumer) throw new Error("No consumer initialized");
    return this._consumer;
  }

  get producer(): ConfluentKafkaProducer {
    if (!this._producer) throw new Error("No producer initialized");
    return this._producer;
  }

  constructor(private readonly options: ConfluentKafkaOptions) {
    super();
    this.setOnProcessingStartHook((_, __, done) => done());
    const { clientId, groupId } = resolveDefaultClientAndGroup(options, DEFAULT_POSTFIX_SERVER);
    this.clientId = clientId;
    this.groupId = groupId;
    this._status$.subscribe((s) => { this.currentStatus = s; });
    this.currentStatus = undefined as unknown as ConfluentKafkaStatus;
  }

  public getStatus(): ConfluentKafkaStatus {
    return this.currentStatus;
  }

  public async listen(callback: (err?: unknown) => void): Promise<void> {
    this.closed = false;
    try {
      await this.queue.enqueue(() => this.connectWithBackoff());
      callback();
    } catch (err) {
      callback(err);
    }
  }

  public async close(): Promise<void> {
    this.logger.log("Closing Confluent Kafka connection...");
    this.closed = true;
    await this.queue.enqueue(() => this.disposeTransport());
  }

  public on<
    EventKey extends string | number | symbol = string | number | symbol,
    EventCallback = (...args: unknown[]) => void,
  >(_event: EventKey, _callback: EventCallback): void {
    throw new Error('Method not supported. Register events via the "consumer" and "producer" attributes.');
  }

  public unwrap<T = [ConfluentKafkaConsumer, ConfluentKafkaProducer]>(): T {
    return [this.consumer, this.producer] as T;
  }

  private async connectWithBackoff(): Promise<void> {
    this.connecting = true;
    try {
      await runWithBackoff(
        this.options.reconnect,
        () => this.closed,
        async () => {
          await this.disposeTransport();
          const kafka = createKafkaInstance(this.options, this.clientId);
          this._producer = createKafkaProducer(kafka, this.options);
          this._consumer = createKafkaConsumer(kafka, this.options, this.groupId);
          await this._producer.connect();
          await this._consumer.connect();
          emitConnected(this._status$);
          await this.attachMessageStream();
          const patterns = [...this.messageHandlers.keys()].join(", ");
          this.logger.log(
            `Confluent Kafka transport ready — consumer group "${this.groupId}"${patterns ? `, patterns: ${patterns}` : ""}`,
          );
        },
        (delay, err) => this.logger.warn(`Kafka unavailable, retry in ${delay}ms: ${formatError(err)}`),
      );
      if (this.closed) return;
    } finally {
      this.connecting = false;
    }
  }

  private scheduleReconnect(): void {
    if (this.closed || this.connecting) return;
    void this.queue
      .enqueue(async () => {
        if (this.closed) return;
        this.logger.warn("Confluent Kafka transport failure, reconnecting");
        await this.connectWithBackoff();
      })
      .catch((err: unknown) => this.logger.error(err));
  }

  private async attachMessageStream(): Promise<void> {
    if (!this._consumer || !this._producer) return;
    const registeredPatterns = [...this.messageHandlers.keys()];
    if (registeredPatterns.length === 0) return;

    const hasBidirectional = Array.from(this.messageHandlers.values()).some((h) => !h.isEventHandler);
    if (hasBidirectional) {
      this.logger.warn(
        'Bidirectional communication (@MessagePattern) is supported but requires reply topics to be pre-created.',
      );
    }

    await this._consumer.subscribe({ topics: registeredPatterns });

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
          commit: () => commitOffset(this.consumer, topic, partition, message.offset),
          heartbeat,
        };
        await this.handleMessage(msg);
      },
    }).catch((err: unknown) => {
      if (!this.closed) {
        emitFailed(this._status$);
        this.logger.error(`Consumer run error: ${formatError(err)}`);
        this.scheduleReconnect();
      }
    });
  }

  public override async handleEvent(
    pattern: string,
    packet: { pattern: string; data: unknown },
    context: ConfluentKafkaContext,
  ): Promise<void> {
    const handler = this.getHandlerByPattern(pattern);
    if (!handler) {
      this.logger.error(`${NO_EVENT_HANDLER} ${pattern}`);
      return;
    }
    await this.runWithProcessingHook(context, async () => {
      const result = await handler(packet.data, context);
      if (isObservable(result)) await firstValueFrom(result);
      this.onProcessingEndHook?.(this.transportId, context);
    });
  }

  public async handleMessage(payload: ConfluentKafkaMessage): Promise<void> {
    const correlationId = payload.headers.get(KafkaHeaders.CORRELATION_ID);
    const replyTopic = payload.headers.get(KafkaHeaders.REPLY_TOPIC);
    const handler = this.getHandlerByPattern(payload.topic);

    if (handler?.isEventHandler || !correlationId || !replyTopic) {
      await this.handleEventMessage(payload);
    } else {
      await this.handleRpcMessage(
        payload,
        correlationId,
        replyTopic,
        payload.headers.get(KafkaHeaders.REPLY_PARTITION),
      );
    }
  }

  private async handleEventMessage(payload: ConfluentKafkaMessage): Promise<void> {
    let data: unknown;
    try {
      data = JSON.parse(payload.value);
    } catch {
      this.logger.warn(`Skipping message on topic "${payload.topic}": invalid JSON`);
      return;
    }

    const defaultRetryMs = 5000;
    const maxRetries = this.options.maxRetries ?? Infinity;
    let failures = 0;

    while (!this.closed) {
      let nackDelay: number | null = null;
      let lastError: unknown = null;
      const commit = () => payload.commit();
      const nack = (delayMs = defaultRetryMs) => { nackDelay = delayMs; };
      const ctx = new ConfluentKafkaContext([
        payload, payload.partition, payload.topic, payload.headers, commit, nack,
      ]);

      try {
        await this.handleEvent(payload.topic, { pattern: payload.topic, data }, ctx);
      } catch (err) {
        this.logger.error(err);
        lastError = err;
        nackDelay = defaultRetryMs;
      }

      if (nackDelay === null) {
        if (this.options.consumeOptions?.autoCommit === false) {
          try {
            await commit();
            return;
          } catch (err) {
            this.logger.error(err);
            lastError = err;
            nackDelay = defaultRetryMs;
          }
        } else {
          await commit();
          return;
        }
      }

      failures++;
      if (failures > maxRetries) {
        await this.sendToDlq(payload, lastError, failures);
        return;
      }
      this.logger.warn(
        `Retrying "${payload.topic}" in ${nackDelay}ms` +
        (isFinite(maxRetries) ? ` (${failures}/${maxRetries})` : ""),
      );
      await this.sleepWithHeartbeat(nackDelay, payload.heartbeat);
    }
  }

  private async handleRpcMessage(
    payload: ConfluentKafkaMessage,
    correlationId: string,
    replyTopic: string,
    replyPartition: string | undefined,
  ): Promise<void> {
    const commit = () => payload.commit();
    const ctx = new ConfluentKafkaContext([
      payload, payload.partition, payload.topic, payload.headers, commit, () => {},
    ]);
    const publish = (data: WritePacket) =>
      this.sendReply(data, replyTopic, replyPartition, correlationId);
    const handler = this.getHandlerByPattern(payload.topic);

    if (!handler) {
      await publish({ err: NO_MESSAGE_HANDLER });
      await commit();
      return;
    }

    await this.runWithProcessingHook(ctx, async () => {
      try {
        const value = JSON.parse(payload.value) as unknown;
        const response$ = this.transformToObservable(
          handler(value, ctx) as Promise<unknown> | Observable<unknown> | unknown,
        );
        const replay$ = new ReplaySubject<unknown>();
        await this.combineStreamsAndThrowIfRetriable(response$, replay$);
        this.send(replay$, publish);
        await commit();
      } catch (err) {
        this.logger.error(err);
        await publish({ err });
      }
    });
  }

  private async sendToDlq(payload: ConfluentKafkaMessage, error: unknown, failures: number): Promise<void> {
    const dlqTopic = this.options.deadLetterTopic;
    if (!dlqTopic) {
      this.logger.warn(`Max retries exceeded on "${payload.topic}", dropping message (no DLQ configured)`);
      await payload.commit().catch(() => undefined);
      return;
    }
    try {
      const headers = buildDlqHeaders(payload, error, failures);
      await this.producer.send({
        topic: dlqTopic,
        messages: [{
          value: payload.value,
          ...(payload.key !== null ? { key: payload.key } : {}),
          headers: mapToHeaders(new Map(Object.entries(headers))),
        }],
      });
      this.logger.warn(`"${payload.topic}" → DLQ "${dlqTopic}" after ${failures} failure(s)`);
    } catch (err) {
      this.logger.error(`Failed to send to DLQ "${dlqTopic}":`, err);
    }
    await payload.commit().catch(() => undefined);
  }

  private async sendReply(
    message: WritePacket,
    replyTopic: string,
    replyPartition: string | undefined,
    correlationId: string,
  ): Promise<void> {
    const headers: Record<string, string> = { [KafkaHeaders.CORRELATION_ID]: correlationId };
    if (message.err) {
      const errStr =
        typeof message.err === "object" && message.err !== null
          ? JSON.stringify(message.err)
          : String(message.err);
      headers[KafkaHeaders.NEST_ERR] = errStr;
    }
    if (message.isDisposed) {
      headers[KafkaHeaders.NEST_IS_DISPOSED] = "1";
    }
    await this.queue.enqueue(() =>
      this.producer.send({
        topic: replyTopic,
        messages: [{
          value: JSON.stringify(message.response ?? null),
          headers,
          ...(replyPartition != null ? { partition: parseInt(replyPartition, 10) } : {}),
        }],
      }),
    );
  }

  private combineStreamsAndThrowIfRetriable(
    response$: Observable<unknown>,
    replay$: ReplaySubject<unknown>,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let resolved = false;
      response$.subscribe({
        next: (val) => {
          replay$.next(val);
          if (!resolved) { resolved = true; resolve(); }
        },
        error: (err) => {
          if (err instanceof KafkaRetriableException && !resolved) {
            resolved = true;
            reject(err);
          } else {
            resolve();
          }
          replay$.error(err);
        },
        complete: () => replay$.complete(),
      });
    });
  }

  private async runWithProcessingHook(
    context: ConfluentKafkaContext,
    phase: () => Promise<void>,
  ): Promise<void> {
    type Hook = (id: Transport, ctx: ConfluentKafkaContext, done: () => Promise<void>) => Promise<void>;
    await (this.onProcessingStartHook as unknown as Hook)(this.transportId, context, phase);
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

  private async disposeTransport(): Promise<void> {
    await disconnectKafkaClients(this._consumer, this._producer);
    this._consumer = undefined;
    this._producer = undefined;
    emitDisconnected(this._status$);
  }
}
