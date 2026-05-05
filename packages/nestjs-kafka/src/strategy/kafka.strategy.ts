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
  KAFKA_DEFAULT_CLIENT,
  KAFKA_DEFAULT_GROUP,
  NO_EVENT_HANDLER,
  NO_MESSAGE_HANDLER,
} from "@nestjs/microservices/constants";
import {
  ConsumerGroupJoinPayload,
  MessageToProduce,
  ProduceResult,
} from "@platformatic/kafka";
import { firstValueFrom, isObservable, Observable, ReplaySubject, Subscription } from "rxjs";
import {
  DEFAULT_KAFKA_STREAM_CONSUME,
  DEFAULT_POSTFIX_SERVER,
} from "../constants/kafka.constants";
import {
  formatError,
  runWithBackoff,
  sleepMs,
} from "../utils/kafka-reconnect";
import { KafkaContext } from "../context/kafka.context";
import {
  KafkaConsumer,
  KafkaProducer,
  KafkaMessage,
  KafkaOptions,
  KafkaStatus,
} from "../types/kafka.types";
import {
  buildDlqHeaders,
  closeKafkaClients,
  createKafkaConsumer,
  createKafkaProducer,
  ensureBootstrapMetadata,
  getOrCreatePartitionQueue,
  getPartitionQueueMetrics,
  logPartitionAssignments,
  logPendingPartitionMetrics,
  registerClientEventListeners,
  resolveKafkaGroupId,
  resolvePostfixId,
  SerialQueue,
  waitForPartitionQueues,
} from "../utils/kafka.utils";
import { deserializeJson, serializeJson } from "../utils/json.utils";

type MessagesStream = Awaited<ReturnType<KafkaConsumer["consume"]>>;

export class KafkaStrategy
  extends Server<never, KafkaStatus>
  implements CustomTransportStrategy
{
  transportId = Transport.KAFKA;
  protected readonly logger = new Logger(KafkaStrategy.name);
  private readonly clientId: string;
  private readonly groupId: string;
  private _consumer: KafkaConsumer | undefined;
  private _producer: KafkaProducer | undefined;
  private messagesStream: MessagesStream | null = null;
  private closed = false;
  private connecting = false;
  private currentStatus: KafkaStatus =
    KafkaStatus.DISCONNECTED;
  private readonly queue = new SerialQueue();
  private readonly partitionQueues = new Map<number, SerialQueue>();
  private _closeResolve: (() => void) | undefined;
  private readonly _closeSignal: Promise<void>;

  get consumer(): KafkaConsumer {
    if (!this._consumer) throw new Error("No consumer initialized");
    return this._consumer;
  }

  get producer(): KafkaProducer {
    if (!this._producer) throw new Error("No producer initialized");
    return this._producer;
  }

  constructor(private readonly options: KafkaOptions) {
    super();
    this._closeSignal = new Promise<void>((resolve) => {
      this._closeResolve = resolve;
    });
    this.setOnProcessingStartHook((_, __, done) => done());
    this._status$.subscribe((s) => {
      this.currentStatus = s;
    });
    const postfixId = resolvePostfixId(
      options.postfixId,
      DEFAULT_POSTFIX_SERVER,
    );
    this.clientId = (options.clientId ?? KAFKA_DEFAULT_CLIENT) + postfixId;
    this.groupId = resolveKafkaGroupId(
      options.groupId,
      KAFKA_DEFAULT_GROUP,
      postfixId,
    );
  }

  public getStatus(): KafkaStatus {
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
    this.logger.log("Closing Kafka connection...");
    this.closed = true;
    this._closeResolve?.();
    await this.stopMessageStream();
    await this.waitForQueues();
    await this.queue.enqueue(() => this.disposeTransport());
  }

  private async stopMessageStream(): Promise<void> {
    if (!this.messagesStream) return;
    const stream = this.messagesStream;
    this.messagesStream = null;
    try {
      await stream.close();
    } catch {}
  }

  public getQueueMetrics(): Record<number, number> {
    return getPartitionQueueMetrics(this.partitionQueues);
  }

  private logPendingMetrics(): void {
    logPendingPartitionMetrics(this.logger, this.partitionQueues);
  }

  private async waitForQueues(): Promise<void> {
    await waitForPartitionQueues(
      this.logger,
      this.partitionQueues,
      this.queue,
      this.options.shutdownTimeoutMs,
    );
  }

  public on<
    EventKey extends string | number | symbol = string | number | symbol,
    EventCallback = (...args: unknown[]) => void,
  >(_event: EventKey, _callback: EventCallback): void {
    throw new Error(
      'Method not supported. Register events via the "consumer" and "producer" attributes.',
    );
  }

  public unwrap<T = [KafkaConsumer, KafkaProducer]>(): T {
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
          this._consumer = createKafkaConsumer(
            this.options,
            this.clientId,
            this.groupId,
          );
          this._producer = createKafkaProducer(this.options, this.clientId);
          registerClientEventListeners(this._consumer, this._status$, () =>
            this.scheduleReconnect(),
          );
          registerClientEventListeners(this._producer, this._status$, () =>
            this.scheduleReconnect(),
          );
          this._consumer.on(
            "consumer:group:join",
            (data: ConsumerGroupJoinPayload) =>
              logPartitionAssignments(this.logger, this.groupId, data),
          );
          await this.attachMessageStream();
          const patterns = [...this.messageHandlers.keys()].join(", ");
          this.logger.log(
            `Kafka transport ready — consumer group "${this.groupId}"${patterns ? `, patterns: ${patterns}` : ""}`,
          );
        },
        (delay, err) =>
          this.logger.warn(
            `Kafka unavailable, retry in ${delay}ms: ${formatError(err)}`,
          ),
        this._closeSignal,
      );
      if (this.closed) return; // close() called during connection — disposeTransport() will clean up
    } finally {
      this.connecting = false;
    }
  }

  private scheduleReconnect(): void {
    if (this.closed || this.connecting) return;
    void this.queue
      .enqueue(async () => {
        if (this.closed) return;
        this.logger.warn("Kafka transport failure, reconnecting");
        await this.connectWithBackoff();
      })
      .catch((err: unknown) => this.logger.error(err));
  }

  private async attachMessageStream(): Promise<void> {
    if (!this._consumer || !this._producer) return;
    const registeredPatterns = [...this.messageHandlers.keys()];
    if (registeredPatterns.length === 0) {
      await Promise.all([
        ensureBootstrapMetadata(this._consumer),
        ensureBootstrapMetadata(this._producer),
      ]);
      return;
    }
    const hasBidirectional = Array.from(this.messageHandlers.values()).some(
      (h) => !h.isEventHandler,
    );
    if (hasBidirectional) {
      this.logger.warn(
        'Bidirectional communication (@MessagePattern) is not fully supported. Messages can be lost during rebalancing. Prefer "@EventPattern" over "@MessagePattern".',
      );
    }
    const stream = await this._consumer.consume({
      sessionTimeout: 10000,
      heartbeatInterval: 500,
      topics: registeredPatterns,
      ...DEFAULT_KAFKA_STREAM_CONSUME,
      ...this.options.consumeOptions,
      autocommit: false,
    });
    this.messagesStream = stream;
    void this.runMessageLoop(stream);
  }

  private async runMessageLoop(stream: MessagesStream): Promise<void> {
    try {
      for await (const message of stream) {
        void getOrCreatePartitionQueue(this.partitionQueues, message.partition)
          .enqueue(() => this.handleMessage(message))
          .catch((err: unknown) => this.logger.error(err));
      }
    } catch (error) {
      if (!this.closed) {
        this.logger.warn(
          `Kafka stream error, reconnecting: ${formatError(error)}`,
        );
        this.scheduleReconnect();
      }
    }
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
    await this.runWithProcessingHook(context, async () => {
      const result = await handler(packet.data, context);
      if (isObservable(result)) await firstValueFrom(result);
      this.onProcessingEndHook?.(this.transportId, context);
    });
  }

  public async handleMessage(payload: KafkaMessage): Promise<void> {
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

  private async handleEventMessage(
    payload: KafkaMessage,
  ): Promise<void> {
    let data = payload.value;
    const defaultRetryMs = 5000;
    const maxRetries = this.options.maxRetries ?? Infinity;
    let failures = 0;

    while (!this.closed) {
      let nackDelay: number | null = null;
      let lastError: unknown = null;
      const commit = () => payload.commit() as Promise<void>;
      const nack = (delayMs = defaultRetryMs) => {
        nackDelay = delayMs;
      };
      const ctx = new KafkaContext([
        payload,
        payload.partition,
        payload.topic,
        payload.headers,
        commit,
        nack,
      ]);

      try {
        await this.handleEvent(
          payload.topic,
          { pattern: payload.topic, data },
          ctx,
        );
      } catch (err) {
        this.logger.error(err);
        lastError = err;
        nackDelay = defaultRetryMs;
      }

      if (nackDelay === null) {
        try {
          await commit();
        } catch (err) {
          if (!(err as { closed?: boolean }).closed) {
            this.logger.error(err);
            this.scheduleReconnect();
          }
        }
        return;
      }

      failures++;
      if (failures > maxRetries) {
        await this.sendToDlq(payload, lastError, failures);
        try {
          await commit();
        } catch (err) {
          if (!(err as { closed?: boolean }).closed) {
            this.logger.error(err);
          }
        }
        return;
      }
      this.logger.warn(
        `Retrying "${payload.topic}" in ${nackDelay}ms` +
          (isFinite(maxRetries) ? ` (${failures}/${maxRetries})` : ""),
      );
      await Promise.race([sleepMs(nackDelay), this._closeSignal]);
    }
  }

  private async handleRpcMessage(
    payload: KafkaMessage,
    correlationId: string,
    replyTopic: string,
    replyPartition: string | undefined,
  ): Promise<void> {
    const commit = () => payload.commit() as Promise<void>;
    const ctx = new KafkaContext([
      payload,
      payload.partition,
      payload.topic,
      payload.headers,
      commit,
      () => {},
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
        const value = deserializeJson(payload.value);
        const response$ = this.transformToObservable(
          handler(value, ctx) as
            | Promise<unknown>
            | Observable<unknown>
            | unknown,
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

  private async sendToDlq(
    payload: KafkaMessage,
    error: unknown,
    failures: number,
  ): Promise<void> {
    const dlqTopic = this.options.deadLetterTopic;
    if (!dlqTopic) {
      this.logger.warn(
        `Max retries exceeded on "${payload.topic}", dropping message (no DLQ configured)`,
      );
      return;
    }
    try {
      const headers = buildDlqHeaders(payload, error, failures);
      await this.producer.send({
        autocreateTopics: true,
        messages: [
          {
            topic: dlqTopic,
            value: payload.value,
            key: payload.key ?? undefined,
            headers,
          },
        ],
      });
      this.logger.warn(
        `"${payload.topic}" → DLQ "${dlqTopic}" after ${failures} failure(s)`,
      );
    } catch (err) {
      this.logger.error(`Failed to send to DLQ "${dlqTopic}":`, err);
    }
  }

  private sendReply(
    message: WritePacket,
    replyTopic: string,
    replyPartition: string | undefined,
    correlationId: string,
  ): Promise<ProduceResult> {
    const headers = new Map<string, string>([
      [KafkaHeaders.CORRELATION_ID, correlationId],
    ]);
    if (message.err) {
      // @ts-ignore
      const errStr = serializeJson(message.err).toString();
      headers.set(KafkaHeaders.NEST_ERR, errStr);
    }
    if (message.isDisposed) {
      headers.set(KafkaHeaders.NEST_IS_DISPOSED, "1");
    }
    const msg: MessageToProduce<string, string, string, string> = {
      topic: replyTopic,
      value: JSON.stringify(message.response ?? null),
      headers,
    };
    if (replyPartition != null) {
      msg.partition = parseInt(replyPartition, 10);
    }
    return this.queue.enqueue(() =>
      this.producer.send({
        autocreateTopics: true,
        ...this.options.produceOptions,
        messages: [msg],
      }),
    );
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
            resolve();
          }
          replay$.error(err);
        },
        complete: () => replay$.complete(),
      });
    });
  }

  private runWithProcessingHook(
    context: KafkaContext,
    phase: () => Promise<void>,
  ): void {
    this.onProcessingStartHook(this.transportId, context, phase);
  }

  private async disposeTransport(): Promise<void> {
    await this.stopMessageStream();
    this.partitionQueues.clear();
    await closeKafkaClients(
      this._consumer,
      this._producer,
      this.getOptionsProp(this.options, "forceClose", false),
    );
    this._consumer = undefined;
    this._producer = undefined;
  }
}
