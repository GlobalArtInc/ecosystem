import { Logger } from "@nestjs/common";
import {
  CustomTransportStrategy,
  KafkaHeaders,
  KafkaRetriableException,
  Server,
  Transport,
  WritePacket,
} from "@nestjs/microservices";
import {
  NO_EVENT_HANDLER,
  NO_MESSAGE_HANDLER,
} from "@nestjs/microservices/constants";
import { CODES, KafkaJS } from "@confluentinc/kafka-javascript";

import {
  firstValueFrom,
  isObservable,
  Observable,
  ReplaySubject,
  Subscription,
} from "rxjs";
import { KafkaContext, headersToMap } from "../context/kafka.context";
import type {
  KafkaDeserializer,
  KafkaSerializer,
  SerdePayload,
} from "../serde/kafka-serde.interface";
import {
  JsonKafkaDeserializer,
  JsonKafkaSerializer,
} from "../serde/json.serde";
import {
  hasSslConfig,
  toConsumerRdKafkaConfig,
  toGlobalRdKafkaConfig,
  toProducerRdKafkaConfig,
} from "../utils/rdkafka-config";
import { computeRetryDelay, getMaxRetries } from "../utils/retry.utils";
import { KAFKA_RETRY_EXTRAS_KEY } from "../decorators/kafka-retry.decorator";
import type { KafkaRetryOptions } from "../decorators/kafka-retry.decorator";
import {
  applyPostfix,
  DEFAULT_POSTFIX_SERVER,
  RDKAFKA_TRANSPORT,
} from "../constants/kafka.constants";
import type {
  KafkaOptions,
  KafkaStatus,
  NackState,
} from "../types/kafka.types";
import { KafkaStatus as Status } from "../types/kafka.types";

/** NestJS custom transport strategy backed by rdkafka via KafkaJS. */
export class KafkaStrategy
  extends Server<never, KafkaStatus>
  implements CustomTransportStrategy
{
  readonly transportId = Transport.KAFKA;
  protected readonly logger = new Logger(KafkaStrategy.name);

  private consumer: KafkaJS.Consumer | undefined;
  private producer: KafkaJS.Producer | undefined;
  private commitTimer: ReturnType<typeof setInterval> | undefined;
  private pendingOffsets = new Map<string, KafkaJS.TopicPartitionOffsetAndMetadata>();
  private failureCounts = new Map<string, number>();
  private closed = false;
  private reconnecting = false;
  private rebalancing = false;
  private currentStatus: KafkaStatus = Status.DISCONNECTED;
  private readonly kafkaSerializer: KafkaSerializer;
  private readonly kafkaDeserializer: KafkaDeserializer;

  constructor(private readonly options: KafkaOptions) {
    super();
    this.kafkaSerializer = options.serializer ?? new JsonKafkaSerializer();
    this.kafkaDeserializer =
      options.deserializer ?? new JsonKafkaDeserializer();
    this._status$.subscribe((s) => {
      this.currentStatus = s;
    });
  }

  private kafkaSerialize(
    topic: string,
    data: unknown,
    headers?: KafkaJS.IHeaders,
  ): Promise<Buffer> {
    return this.kafkaSerializer.serialize(topic, data, headers);
  }

  private kafkaDeserialize(
    topic: string,
    payload: SerdePayload,
    headers?: KafkaJS.IHeaders,
  ): Promise<unknown> {
    return this.kafkaDeserializer.deserialize(topic, payload, headers);
  }

  public getStatus(): KafkaStatus {
    return this.currentStatus;
  }

  public async listen(callback: (err?: unknown) => void): Promise<void> {
    this.closed = false;
    try {
      await this.connect();
      callback();
    } catch (err) {
      this._status$.next(Status.FAILED);
      callback(err);
    }
  }

  private async connect(): Promise<void> {
    const { clientId, groupId } = applyPostfix(
      this.options,
      DEFAULT_POSTFIX_SERVER,
    );
    const kafka = this.createKafka(clientId);

    const rebalanceCb = async (
      err: { code: number; message: string },
      assignment: Array<{ topic: string; partition: number }>,
      assignmentFns: {
        assign: (a: typeof assignment) => void;
        unassign: (a: typeof assignment) => void;
      },
    ) => {
      if (err.code === CODES.ERRORS.ERR__REVOKE_PARTITIONS) {
        this.rebalancing = true;
        this.pendingOffsets.clear();
        this.failureCounts.clear();
        this.logger.log(`Rebalance: revoking ${assignment.length} partition(s), pausing consumption`);
        assignmentFns.unassign(assignment);
      } else if (err.code === CODES.ERRORS.ERR__ASSIGN_PARTITIONS) {
        this.pendingOffsets.clear();
        this.failureCounts.clear();
        this.rebalancing = false;
        this.logger.log(`Rebalance: assigned ${assignment.length} partition(s), resuming consumption`);
        assignmentFns.assign(assignment);
      }
    };

    this.consumer = kafka.consumer({
      ...toConsumerRdKafkaConfig(this.options.consumerRdKafka),
      'rebalance_cb': rebalanceCb,
      kafkaJS: {
        groupId,
        ...(this.options.consumer ?? {}),
        autoCommit: false,
      },
    });
    this.producer = kafka.producer({
      ...toProducerRdKafkaConfig(this.options.producerRdKafka),
      ...(this.options.producer ? { kafkaJS: this.options.producer } : {}),
    });

    await this.consumer.connect();
    await this.producer.connect();
    this._status$.next(Status.CONNECTED);

    const internalClient = (this.consumer as any)._getInternalClient?.();
    if (internalClient) {
      internalClient.on('event.error', (err: { isFatal?: boolean; message?: string }) => {
        if (err.isFatal && !this.closed) {
          this.logger.error(`Fatal Kafka consumer error: ${err.message}`);
          this.scheduleReconnect();
        }
      });
    }

    this.commitTimer = setInterval(async () => {
      if (this.pendingOffsets.size === 0 || this.rebalancing) return;
      const offsets = [...this.pendingOffsets.values()];
      this.pendingOffsets.clear();
      await this.consumer?.commitOffsets(offsets).catch(() => {});
    }, 1000);

    const topics = [...this.messageHandlers.keys()];
    if (topics.length > 0) {
      if (this.options.autoCreateTopics) {
        const topicsToCreate = topics.flatMap((topic) => {
          const handler = this.getHandlerByPattern(topic);
          return handler && !handler.isEventHandler
            ? [topic, `${topic}.reply`]
            : [topic];
        });
        const admin = kafka.admin();
        try {
          await admin.connect();
          await admin.createTopics({
            topics: topicsToCreate.map((topic) => ({ ...this.options.autoCreateTopics!, topic })),
          });
        } catch (err) {
          this.logger.warn('Failed to auto-create topics (they may already exist)', err);
        } finally {
          await admin.disconnect().catch(() => {});
        }
      }
      await this.consumer.subscribe({ topics });
      if (this.options.batchMode) {
        await this.consumer.run({
          ...(this.options.consumerRun ?? {}),
          eachBatch: async ({ batch, resolveOffset, heartbeat, pause, isRunning, isStale }) => {
            for (const message of batch.messages) {
              if (!isRunning() || isStale()) break;

              const ok = await this.processMessage({
                message,
                heartbeat,
                partition: batch.partition,
                topic: batch.topic,
                pause,
              });

              if (ok) {
                resolveOffset(message.offset);
              } else {
                break;
              }
            }
          },
        });
      } else {
        await this.consumer.run({
          ...(this.options.consumerRun ?? {}),
          eachMessage: async (payload) => { 
            await this.processMessage(payload);
          },
        });
      }
    }
  }

  private scheduleReconnect(attempt = 1): void {
    if (attempt === 1 && this.reconnecting) return;
    this.reconnecting = true;
    this.rebalancing = false;
    const delay = Math.min(1000 * 2 ** (attempt - 1), 30000);
    this.logger.warn(`Reconnecting in ${delay}ms (attempt ${attempt})`);
    this._status$.next(Status.DISCONNECTED);
    clearInterval(this.commitTimer);
    this.pendingOffsets.clear();
    this.failureCounts.clear();

    setTimeout(async () => {
      if (this.closed) return;
      try {
        await Promise.allSettled([
          this.consumer?.disconnect(),
          this.producer?.disconnect(),
        ]);
        await this.connect();
        this.reconnecting = false;
      } catch (err) {
        this.logger.error(`Reconnect attempt ${attempt} failed`, err);
        this.scheduleReconnect(attempt + 1);
      }
    }, delay);
  }

  public async close(): Promise<void> {
    this.logger.log("Closing Kafka transport...");
    this.closed = true;
    this.reconnecting = false;
    this.rebalancing = false;
    clearInterval(this.commitTimer);
    this.pendingOffsets.clear();
    this.failureCounts.clear();

    await Promise.allSettled([
      this.consumer?.disconnect(),
      this.producer?.disconnect(),
    ]);
    this._status$.next(Status.DISCONNECTED);
  }

  public on<
    EventKey extends string | number | symbol = string | number | symbol,
    EventCallback = (...args: unknown[]) => void,
  >(_event: EventKey, _callback: EventCallback): void {
    throw new Error(
      'Method not supported. Use "consumer" and "producer" via unwrap().',
    );
  }

  public unwrap<T = [KafkaJS.Consumer, KafkaJS.Producer]>(): T {
    if (!this.consumer || !this.producer) {
      throw new Error("Transport not initialized. Call listen() first.");
    }
    return [this.consumer, this.producer] as T;
  }

  private createKafka(clientId: string | undefined): KafkaJS.Kafka {
    const { ssl, rdKafka } = this.options;
    const sslEnabled = ssl ?? hasSslConfig(rdKafka);
    return new KafkaJS.Kafka({
      ...toGlobalRdKafkaConfig(rdKafka),
      kafkaJS: {
        brokers: this.options.brokers,
        ...(clientId && { clientId }),
        ...(sslEnabled && { ssl: true }),
        ...(this.options.sasl && { sasl: this.options.sasl }),
      },
    });
  }

  private async processMessage(
    payload: KafkaJS.EachMessagePayload,
  ): Promise<boolean> {
    if (this.rebalancing) return false;
    const { topic, partition, message, pause } = payload;
    const headers = "headers" in message ? message.headers : undefined;
    const headersMap = headersToMap(headers);

    const correlationId = headersMap.get(KafkaHeaders.CORRELATION_ID);
    const replyTopic = headersMap.get(KafkaHeaders.REPLY_TOPIC);
    const handler = this.getHandlerByPattern(topic);

    if (handler?.isEventHandler || !correlationId || !replyTopic) {
      return this.handleEventMessage(topic, partition, message, headers, pause);
    } else {
      await this.handleRpcMessage(
        topic,
        partition,
        message,
        headers,
        correlationId,
        replyTopic,
        headersMap.get(KafkaHeaders.REPLY_PARTITION),
      );
      return true;
    }
  }

  private getRetryOverrides(topic: string): KafkaRetryOptions | undefined {
    const handler = this.getHandlerByPattern(topic);
    return (handler as { extras?: Record<string, unknown> } | null)?.extras?.[
      KAFKA_RETRY_EXTRAS_KEY
    ] as KafkaRetryOptions | undefined;
  }

  private async handleEventMessage(
    topic: string,
    partition: number,
    message: KafkaJS.KafkaMessage,
    headers: KafkaJS.IHeaders | undefined,
    pause: () => () => void,
  ): Promise<boolean> {
    const overrides = this.getRetryOverrides(topic);
    const strategy =
      overrides?.strategy ?? this.options.retryStrategy ?? { type: "fixed" as const };
    const maxRetries = overrides?.maxRetries ?? getMaxRetries(strategy);
    const key = `${topic}:${partition}:${message.offset}`;
    const failures = this.failureCounts.get(key) ?? 0;

    let nackState: NackState = null;
    let lastError: unknown = null;
    const nack = (delayMs?: number) => { nackState = delayMs ?? "auto"; };

    const ctx = new KafkaContext(message, partition, topic, headers, nack);
    const data = await this.kafkaDeserialize(topic, message.value, headers);

    try {
      await this.handleEvent(topic, { pattern: topic, data }, ctx);
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : JSON.stringify(err, null, 2);
      const errStack = err instanceof Error ? err.stack : undefined;
      this.logger.error(
        `Handler error on topic="${topic}" partition=${partition} offset=${message.offset}: ${errMessage}`,
        errStack,
      );
      lastError = err;
      nackState = "auto";
    }

    if (nackState === null) {
      this.failureCounts.delete(key);
      this.storeOffset(topic, partition, message.offset);
      return true;
    }

    const newFailures = failures + 1;

    if (newFailures > maxRetries) {
      await this.sendToDlq(
        topic,
        partition,
        message,
        headers,
        lastError,
        newFailures,
        overrides?.deadLetterTopic,
      );
      this.failureCounts.delete(key);
      this.storeOffset(topic, partition, message.offset);
      return true;
    }

    this.failureCounts.set(key, newFailures);
    const delayMs = nackState === "auto" ? computeRetryDelay(strategy, newFailures) : nackState;
    this.logger.warn(
      `Retrying "${topic}" in ${delayMs}ms` +
        (isFinite(maxRetries) ? ` (${newFailures}/${maxRetries})` : ""),
    );

    this.consumer?.seek({ topic, partition, offset: message.offset });
    const resume = pause();
    setTimeout(() => {
      if (!this.closed && !this.reconnecting) resume();
    }, delayMs);

    return false;
  }

  public override async handleEvent(
    pattern: string,
    packet: { pattern: string; data: unknown },
    context: KafkaContext,
  ): Promise<void> {
    const handler = this.getHandlerByPattern(pattern);
    if (!handler) {
      this.logger.error(`${NO_EVENT_HANDLER} ${pattern}`);
      return;
    }
    const result = await handler(packet.data, context);
    if (isObservable(result)) await firstValueFrom(result);
  }

  private async handleRpcMessage(
    topic: string,
    partition: number,
    message: KafkaJS.KafkaMessage,
    headers: KafkaJS.IHeaders | undefined,
    correlationId: string,
    replyTopic: string,
    replyPartition: string | undefined,
  ): Promise<void> {
    const nack = () => {};
    const ctx = new KafkaContext(
      message,
      partition,
      topic,
      headers,
      nack,
    );
    const publish = (data: WritePacket) =>
      this.sendReply(data, replyTopic, replyPartition, correlationId);
    const handler = this.getHandlerByPattern(topic);

    if (!handler) {
      await publish({ err: NO_MESSAGE_HANDLER });
      this.storeOffset(topic, partition, message.offset);
      return;
    }

    try {
      const value = await this.kafkaDeserialize(topic, message.value, headers);
      const response$ = this.transformToObservable(handler(value, ctx));
      const replay$ = new ReplaySubject<unknown>();
      await this.combineStreamsAndThrowIfRetriable(response$, replay$);
      this.send(replay$, publish);
      this.storeOffset(topic, partition, message.offset);
    } catch (err) {
      this.logger.error(err);
      await publish({ err });
    }
  }

  private storeOffset(topic: string, partition: number, offset: string): void {
    this.pendingOffsets.set(`${topic}:${partition}`, {
      topic,
      partition,
      offset: String(Number(offset) + 1),
    });
  }

  private async sendToDlq(
    topic: string,
    partition: number,
    message: KafkaJS.KafkaMessage,
    headers: KafkaJS.IHeaders | undefined,
    error: unknown,
    failures: number,
    deadLetterTopicOverride?: string | false,
  ): Promise<void> {
    const dlqTopic =
      deadLetterTopicOverride === false
        ? undefined
        : (deadLetterTopicOverride ?? this.options.deadLetterTopic);
    if (!dlqTopic) {
      this.logger.warn(
        `Max retries exceeded on "${topic}", dropping message (no DLQ configured)`,
      );
      return;
    }
    try {
      const dlqHeaders: KafkaJS.IHeaders = {
        "x-dlq-original-topic": topic,
        "x-dlq-original-partition": String(partition),
        "x-dlq-original-offset": message.offset,
        "x-dlq-failures": String(failures),
        "x-dlq-error": String(error).slice(0, 500),
      };
      if (headers) {
        for (const [k, v] of Object.entries(headers)) {
          if (!(k in dlqHeaders) && v) dlqHeaders[k] = v;
        }
      }
      await this.producer!.send({
        topic: dlqTopic,
        messages: [
          { key: message.key, value: message.value, headers: dlqHeaders },
        ],
      });
      this.logger.warn(
        `"${topic}" → DLQ "${dlqTopic}" after ${failures} failure(s)`,
      );
    } catch (err) {
      this.logger.error(`Failed to send to DLQ "${dlqTopic}":`, err);
    }
  }

  private async sendReply(
    message: WritePacket,
    replyTopic: string,
    replyPartition: string | undefined,
    correlationId: string,
  ): Promise<KafkaJS.RecordMetadata[]> {
    const headers: KafkaJS.IHeaders = {
      [KafkaHeaders.CORRELATION_ID]: correlationId,
    };
    if (message.err) {
      headers[KafkaHeaders.NEST_ERR] = JSON.stringify(message.err);
    }
    if (message.isDisposed) {
      headers[KafkaHeaders.NEST_IS_DISPOSED] = "1";
    }
    const msg: KafkaJS.Message = {
      value: await this.kafkaSerialize(
        replyTopic,
        message.response ?? null,
        headers,
      ),
      headers,
    };
    if (replyPartition != null) {
      msg.partition = parseInt(replyPartition, 10);
    }
    return this.producer!.send({ topic: replyTopic, messages: [msg] });
  }

  private combineStreamsAndThrowIfRetriable(
    response$: Observable<unknown>,
    replay$: ReplaySubject<unknown>,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let resolved = false;
      let sub: Subscription;
      sub = response$.subscribe({
        next: (val) => {
          replay$.next(val);
          if (!resolved) {
            resolved = true;
            resolve();
          }
        },
        error: (err) => {
          if (err instanceof KafkaRetriableException && !resolved) {
            resolved = true;
            sub.unsubscribe();
            reject(err);
          } else {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          }
          replay$.error(err);
        },
        complete: () => replay$.complete(),
      });
    });
  }

}
