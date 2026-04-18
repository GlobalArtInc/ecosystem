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
import { ConsumerGroupJoinPayload, MessageToProduce, ProduceResult } from "@platformatic/kafka";
import { firstValueFrom, isObservable, Observable, ReplaySubject } from "rxjs";
import {
  DEFAULT_PLATFORMATIC_STREAM_CONSUME,
  DEFAULT_POSTFIX_SERVER,
} from "../constants/platformatic-kafka.constants";
import { runWithBackoff, sleepMs } from "../utils/platformatic-kafka-reconnect";
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
  logPartitionAssignments,
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
    this.setOnProcessingStartHook((_, __, done) => done());
    const postfixId = resolvePostfixId(options.postfixId, DEFAULT_POSTFIX_SERVER);
    this.clientId = (options.clientId ?? KAFKA_DEFAULT_CLIENT) + postfixId;
    this.groupId = resolveKafkaGroupId(options.groupId, KAFKA_DEFAULT_GROUP, postfixId);
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
  >(_event: EventKey, _callback: EventCallback): void {
    throw new Error('Method not supported. Register events via the "consumer" and "producer" attributes.');
  }

  public unwrap<T = [KafkaConsumer, KafkaProducer]>(): T {
    return [this.consumer, this.producer] as T;
  }

  private async connectWithBackoff(): Promise<void> {
    await runWithBackoff(
      this.options.reconnect,
      () => this.closed,
      async () => {
        await this.disposeTransport();
        this._consumer = createKafkaConsumer(this.options, this.clientId, this.groupId);
        this._producer = createKafkaProducer(this.options, this.clientId);
        registerClientEventListeners(this._consumer, this._status$, () => this.scheduleReconnect());
        registerClientEventListeners(this._producer, this._status$, () => this.scheduleReconnect());
        this._consumer.on("consumer:group:join", (data: ConsumerGroupJoinPayload) =>
          logPartitionAssignments(this.logger, this.groupId, data),
        );
        await this.attachMessageStream();
        const patterns = [...this.messageHandlers.keys()].join(", ");
        this.logger.log(
          `Kafka transport ready — consumer group "${this.groupId}"${patterns ? `, patterns: ${patterns}` : ""}`,
        );
      },
      (delay) => this.logger.warn(`Kafka unavailable, retry in ${delay}ms`),
    );
    if (this.closed) throw new Error("Kafka transport closed before connect");
  }

  private scheduleReconnect(): void {
    if (this.closed) return;
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
        'Bidirectional communication is not fully supported by "@platformatic/kafka". Messages can be lost during rebalancing. Prefer "@EventPattern" over "@MessagePattern".',
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
        .catch((err: unknown) => this.logger.error(err));
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
    await this.runWithProcessingHook(context, async () => {
      const result = await handler(packet.data, context);
      if (isObservable(result)) await firstValueFrom(result);
      this.onProcessingEndHook?.(this.transportId, context);
    });
  }

  public async handleMessage(payload: PlatformaticKafkaMessage): Promise<void> {
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

  private async handleEventMessage(payload: PlatformaticKafkaMessage): Promise<void> {
    let data: unknown;
    try {
      data = JSON.parse(payload.value);
    } catch {
      this.logger.warn(`Skipping message on topic "${payload.topic}": invalid JSON`);
      return;
    }

    const retryMs = 5000;
    while (!this.closed) {
      let nackDelay: number | null = null;
      const commit = () => payload.commit() as Promise<void>;
      const nack = (delayMs = retryMs) => { nackDelay = delayMs; };
      const ctx = new PlatformaticKafkaContext([
        payload, payload.partition, payload.topic, payload.headers, commit, nack,
      ]);
      try {
        await this.handleEvent(payload.topic, { pattern: payload.topic, data }, ctx);
      } catch (err) {
        this.logger.error(err);
        nackDelay = retryMs;
      }
      if (nackDelay === null) {
        if (this.options.consumeOptions?.autocommit === false) {
          try {
            await commit();
          } catch (err) {
            this.logger.error(err);
            nackDelay = retryMs;
            continue;
          }
        }
        return;
      }
      this.logger.warn(`Retrying message on topic "${payload.topic}" in ${nackDelay}ms`);
      await sleepMs(nackDelay);
    }
  }

  private async handleRpcMessage(
    payload: PlatformaticKafkaMessage,
    correlationId: string,
    replyTopic: string,
    replyPartition: string | undefined,
  ): Promise<void> {
    const commit = () => payload.commit() as Promise<void>;
    const ctx = new PlatformaticKafkaContext([
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

  private sendReply(
    message: WritePacket,
    replyTopic: string,
    replyPartition: string | undefined,
    correlationId: string,
  ): Promise<ProduceResult> {
    const headers = new Map<string, string>([[KafkaHeaders.CORRELATION_ID, correlationId]]);
    if (message.err) {
      const errStr =
        typeof message.err === "object" && message.err !== null
          ? JSON.stringify(message.err)
          : String(message.err);
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
      this.producer.send({ autocreateTopics: true, ...this.options.produceOptions, messages: [msg] }),
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
    context: PlatformaticKafkaContext,
    phase: () => Promise<void>,
  ): Promise<void> {
    type Hook = (id: Transport, ctx: PlatformaticKafkaContext, done: () => Promise<void>) => Promise<void>;
    await (this.onProcessingStartHook as unknown as Hook)(this.transportId, context, phase);
  }

  private async disposeTransport(): Promise<void> {
    if (this.messagesStream) {
      try { await this.messagesStream.close(); } catch {}
      this.messagesStream = null;
    }
    await closeKafkaClients(this._consumer, this._producer, this.getOptionsProp(this.options, "forceClose", false));
    this._consumer = undefined;
    this._producer = undefined;
  }
}
