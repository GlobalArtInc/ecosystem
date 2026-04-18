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
import { firstValueFrom, isObservable, Observable, ReplaySubject } from "rxjs";
import {
  DEFAULT_PLATFORMATIC_STREAM_CONSUME,
  DEFAULT_POSTFIX_SERVER,
} from "../constants/platformatic-kafka.constants";
import { getReconnectDelays, sleepMs } from "../utils/platformatic-kafka-reconnect";
import { PlatformaticKafkaContext } from "../context/platformatic-kafka.context";
import {
  KafkaConsumer,
  KafkaProducer,
  PlatformaticKafkaMessage,
  PlatformaticKafkaOptions,
  PlatformaticKafkaStatus,
} from "../types/platformatic-kafka.types";
import {
  closeKafkaClients,
  createKafkaConsumer,
  createKafkaProducer,
  ensureBootstrapMetadata,
  registerClientEventListeners,
  resolveKafkaGroupId,
  resolvePostfixId,
  SerialQueue,
} from "../utils/platformatic-kafka.utils";

type MessagesStream = Awaited<ReturnType<KafkaConsumer["consume"]>>;

export class PlatformaticKafkaStrategy
  extends Server<never, PlatformaticKafkaStatus>
  implements CustomTransportStrategy
{
  transportId = Transport.KAFKA;
  protected readonly logger = new Logger(PlatformaticKafkaStrategy.name);
  private readonly clientId: string;
  private readonly groupId: string;
  private _consumer: KafkaConsumer | undefined;
  private _producer: KafkaProducer | undefined;
  private messagesStream: MessagesStream | null = null;
  private closed = false;
  private readonly queue = new SerialQueue();
  private readonly inboundMessageQueue = new SerialQueue();

  get consumer(): KafkaConsumer {
    if (!this._consumer) throw new Error("No consumer initialized");
    return this._consumer;
  }

  get producer(): KafkaProducer {
    if (!this._producer) throw new Error("No producer initialized");
    return this._producer;
  }

  constructor(private readonly options: PlatformaticKafkaOptions) {
    super();
    this.setOnProcessingStartHook((_transportId, _context, done) =>
      Promise.resolve().then(() => done()),
    );
    const postfixId = resolvePostfixId(
      this.options.postfixId,
      DEFAULT_POSTFIX_SERVER,
    );
    this.clientId = (this.options.clientId ?? KAFKA_DEFAULT_CLIENT) + postfixId;
    this.groupId = resolveKafkaGroupId(
      this.options.groupId,
      KAFKA_DEFAULT_GROUP,
      postfixId,
    );
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
    await Promise.all([this.inboundMessageQueue.idle(), this.queue.idle()]);
    await this.queue.enqueue(() => this.disposeTransport());
  }

  public on<
    EventKey extends string | number | symbol = string | number | symbol,
    EventCallback = (...args: unknown[]) => void,
  >(event: EventKey, callback: EventCallback): void {
    void event;
    void callback;
    throw new Error(
      'Method not supported, register events using the "consumer" and "producer" attributes',
    );
  }

  public unwrap<T = [KafkaConsumer, KafkaProducer]>(): T {
    return [this.consumer, this.producer] as T;
  }

  private async connectWithBackoff(): Promise<void> {
    const delays = getReconnectDelays(this.options.reconnect ?? {});
    let delay = delays.initial;
    while (!this.closed) {
      try {
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
          (data: ConsumerGroupJoinPayload) => {
            this.logPartitionAssignments(data);
          },
        );
        await this.attachMessageStream();
        const patterns = [...this.messageHandlers.keys()].join(", ");
        this.logger.log(
          `Kafka transport ready — consumer group "${this.groupId}"${patterns.length > 0 ? `, patterns: ${patterns}` : ""}`,
        );
        return;
      } catch (err) {
        if (this.closed) throw err;
        this.logger.warn(`Kafka unavailable, retry in ${delay}ms`);
        await sleepMs(delay);
        delay = Math.min(Math.floor(delay * delays.factor), delays.max);
      }
    }
    throw new Error("Kafka transport closed before connect");
  }

  private logPartitionAssignments(data: ConsumerGroupJoinPayload): void {
    const assignments = (data.assignments ?? []).filter(
      (a) => a.partitions.length > 0,
    );
    if (assignments.length === 0) return;
    const totalPartitions = assignments.reduce(
      (sum, a) => sum + a.partitions.length,
      0,
    );
    const topicWidth = Math.max(...assignments.map((a) => a.topic.length));
    const rows = assignments
      .map((a) => {
        const topic = a.topic.padEnd(topicWidth);
        const parts = a.partitions.join(", ");
        return `  ${topic}  →  [${parts}]  (${a.partitions.length})`;
      })
      .join("\n");
    this.logger.log(
      `Consumer group "${this.groupId}" — assigned ${totalPartitions} partition(s) across ${assignments.length} topic(s):\n${rows}`,
    );
  }

  private scheduleReconnect(): void {
    if (this.closed) return;
    void this.queue
      .enqueue(async () => {
        if (this.closed) return;
        this.logger.warn("Kafka transport failure, reconnecting");
        await this.connectWithBackoff();
      })
      .catch((err: unknown) => {
        this.logger.error(err);
      });
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
    const hasBidirectionalTopics = Array.from(
      this.messageHandlers.values(),
    ).some((handler) => !handler.isEventHandler);
    if (hasBidirectionalTopics) {
      this.logger.warn(
        'Bidirectional communication is not fully supported by the "@platformatic/kafka" library. Messages can be lost during rebalancing. Prefer "@EventPattern" over "@MessagePattern".',
      );
    }
    const stream = await this._consumer.consume({
      autocommit: true,
      sessionTimeout: 10000,
      heartbeatInterval: 500,
      topics: registeredPatterns,
      ...DEFAULT_PLATFORMATIC_STREAM_CONSUME,
      ...this.options.consumeOptions,
    });
    this.messagesStream = stream;
    stream.on("data", (message: PlatformaticKafkaMessage) => {
      void this.inboundMessageQueue
        .enqueue(() => this.handleMessage(message))
        .catch((err: unknown) => {
          this.logger.error(err);
        });
    });
    stream.on("error", (error: Error) => {
      this.handleError(error.message);
      this.scheduleReconnect();
    });
  }

  public override async handleEvent(
    pattern: string,
    packet: { pattern: string; data: unknown },
    context: PlatformaticKafkaContext,
  ): Promise<void> {
    const handler = this.getHandlerByPattern(pattern);
    if (!handler) {
      this.logger.error(`${NO_EVENT_HANDLER} ${pattern}`);
      return;
    }
    await this.runWithProcessingStartHook(context, async () => {
      const resultOrStream = await handler(packet.data, context);
      if (isObservable(resultOrStream)) {
        await firstValueFrom(resultOrStream);
      }
      this.onProcessingEndHook?.(this.transportId, context);
    });
  }

  public async handleMessage(payload: PlatformaticKafkaMessage): Promise<void> {
    const headers = payload.headers;
    const correlationId = headers.get(KafkaHeaders.CORRELATION_ID);
    const replyTopic = headers.get(KafkaHeaders.REPLY_TOPIC);
    const replyPartition = headers.get(KafkaHeaders.REPLY_PARTITION);

    const handler = this.getHandlerByPattern(payload.topic);

    if (handler?.isEventHandler || !correlationId || !replyTopic) {
      let data: unknown;
      try {
        data = JSON.parse(payload.value);
      } catch {
        this.logger.warn(
          `Skipping message on topic "${payload.topic}": invalid JSON`,
        );
        return;
      }
      const handlerRetryMs = 5000;
      while (!this.closed) {
        let nackDelay: number | null = null;
        const commit = () => payload.commit() as Promise<void>;
        const nack = (delayMs = handlerRetryMs) => {
          nackDelay = delayMs;
        };
        const kafkaContext = new PlatformaticKafkaContext([
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
            kafkaContext,
          );
        } catch (err) {
          this.logger.error(err);
          nackDelay = handlerRetryMs;
        }
        if (nackDelay === null) {
          if (this.options.consumeOptions?.autocommit === false) {
            try {
              await commit();
            } catch (commitErr) {
              this.logger.error(commitErr);
              nackDelay = handlerRetryMs;
              continue;
            }
          }
          return;
        }
        this.logger.warn(
          `Retrying message on topic "${payload.topic}" in ${nackDelay}ms`,
        );
        await sleepMs(nackDelay);
      }
      return;
    }

    const commit = () => payload.commit() as Promise<void>;
    const kafkaContext = new PlatformaticKafkaContext([
      payload,
      payload.partition,
      payload.topic,
      payload.headers,
      commit,
      () => {},
    ]);
    const publish = this.getPublisher(
      replyTopic,
      replyPartition,
      correlationId,
    );

    if (!handler) {
      await publish({ err: NO_MESSAGE_HANDLER });
      await commit();
      return;
    }

    await this.runWithProcessingStartHook(kafkaContext, async () => {
      try {
        const deserializedValue = JSON.parse(payload.value) as unknown;
        const response$ = this.transformToObservable(
          handler(deserializedValue, kafkaContext) as
            | Promise<unknown>
            | Observable<unknown>
            | unknown,
        );
        const replayStream$ = new ReplaySubject<unknown>();
        await this.combineStreamsAndThrowIfRetriable(response$, replayStream$);
        this.send(replayStream$, publish);
        await commit();
      } catch (err) {
        this.logger.error(err);
        await publish({ err });
      }
    });
  }

  private async runWithProcessingStartHook(
    context: PlatformaticKafkaContext,
    phase: () => Promise<void>,
  ): Promise<void> {
    type HookReturningPromise = (
      transportId: Transport,
      ctx: PlatformaticKafkaContext,
      done: () => Promise<void>,
    ) => Promise<void>;
    await (this.onProcessingStartHook as unknown as HookReturningPromise)(
      this.transportId,
      context,
      phase,
    );
  }

  private async disposeTransport(): Promise<void> {
    if (this.messagesStream) {
      try {
        await this.messagesStream.close();
      } catch {}
      this.messagesStream = null;
    }
    const forceClose = this.getOptionsProp(this.options, "forceClose", false);
    await closeKafkaClients(this._consumer, this._producer, forceClose);
    this._consumer = undefined;
    this._producer = undefined;
  }

  private getPublisher(
    replyTopic: string,
    replyPartition: string | undefined,
    correlationId: string,
  ): (data: WritePacket) => Promise<ProduceResult> {
    return (data: WritePacket) =>
      this.sendMessage(data, replyTopic, replyPartition, correlationId);
  }

  private async sendMessage(
    message: WritePacket,
    replyTopic: string,
    replyPartition: string | undefined,
    correlationId: string,
  ): Promise<ProduceResult> {
    const headers = new Map<string, string>();
    const outgoingMessage: MessageToProduce<string, string, string, string> = {
      topic: replyTopic,
      value: JSON.stringify(message.response ?? null),
      headers,
    };
    this.assignReplyPartition(replyPartition, outgoingMessage);
    this.assignCorrelationIdHeader(correlationId, headers);
    this.assignErrorHeader(message, headers);
    this.assignIsDisposedHeader(message, headers);
    return this.queue.enqueue(() =>
      this.producer.send({
        autocreateTopics: true,
        ...this.options.produceOptions,
        messages: [outgoingMessage],
      }),
    );
  }

  private combineStreamsAndThrowIfRetriable(
    response$: Observable<unknown>,
    replayStream$: ReplaySubject<unknown>,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let isPromiseResolved = false;
      response$.subscribe({
        next: (val: unknown) => {
          replayStream$.next(val);
          if (!isPromiseResolved) {
            isPromiseResolved = true;
            resolve();
          }
        },
        error: (err: unknown) => {
          if (err instanceof KafkaRetriableException && !isPromiseResolved) {
            isPromiseResolved = true;
            reject(err);
          } else {
            resolve();
          }
          replayStream$.error(err);
        },
        complete: () => replayStream$.complete(),
      });
    });
  }

  private assignIsDisposedHeader(
    outgoingResponse: WritePacket,
    headers: Map<string, string>,
  ): void {
    if (outgoingResponse.isDisposed) {
      headers.set(KafkaHeaders.NEST_IS_DISPOSED, "1");
    }
  }

  private assignErrorHeader(
    outgoingResponse: WritePacket,
    headers: Map<string, string>,
  ): void {
    if (!outgoingResponse.err) return;
    const stringifiedError =
      typeof outgoingResponse.err === "object" && outgoingResponse.err !== null
        ? JSON.stringify(outgoingResponse.err)
        : String(outgoingResponse.err);
    headers.set(KafkaHeaders.NEST_ERR, stringifiedError);
  }

  private assignCorrelationIdHeader(
    correlationId: string,
    headers: Map<string, string>,
  ): void {
    headers.set(KafkaHeaders.CORRELATION_ID, correlationId);
  }

  private assignReplyPartition(
    replyPartition: string | undefined,
    outgoingMessage: MessageToProduce<string, string, string, string>,
  ): void {
    if (replyPartition !== undefined && replyPartition !== null) {
      outgoingMessage.partition = Number.parseInt(replyPartition, 10);
    }
  }
}
