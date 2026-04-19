import { Logger } from "@nestjs/common";
import { isNil, isUndefined } from "@nestjs/common/utils/shared.utils";
import {
  ClientProxy,
  IncomingResponse,
  MsPattern,
  ReadPacket,
  WritePacket,
} from "@nestjs/microservices";
import {
  KAFKA_DEFAULT_CLIENT,
  KAFKA_DEFAULT_GROUP,
} from "@nestjs/microservices/constants";
import { KafkaHeaders } from "@nestjs/microservices/enums";
import { InvalidKafkaClientTopicException } from "@nestjs/microservices/errors/invalid-kafka-client-topic.exception";
import { InvalidMessageException } from "@nestjs/microservices/errors/invalid-message.exception";
import { ConsumerGroupJoinPayload, MessageToProduce } from "@platformatic/kafka";
import { connectable, defer, mergeMap, Observable, Subject, throwError } from "rxjs";
import {
  DEFAULT_PLATFORMATIC_STREAM_CONSUME,
  DEFAULT_POSTFIX_CLIENT,
} from "../constants/platformatic-kafka.constants";
import { formatError, runWithBackoff, sleepMs } from "../utils/platformatic-kafka-reconnect";
import {
  KafkaConsumer,
  KafkaProducer,
  PlatformaticKafkaMessage,
  PlatformaticKafkaOptions,
  PlatformaticKafkaStatus,
} from "../types/platformatic-kafka.types";
import {
  buildEmitMessageParts,
  closeKafkaClients,
  createKafkaConsumer,
  createKafkaProducer,
  ensureBootstrapMetadata,
  registerClientEventListeners,
  resolveKafkaGroupId,
  resolvePostfixId,
  SerialQueue,
} from "../utils/platformatic-kafka.utils";

type ResponseMessagesStream = Awaited<ReturnType<KafkaConsumer["consume"]>>;

export class PlatformaticKafkaClient extends ClientProxy<
  Record<never, never>,
  PlatformaticKafkaStatus
> {
  protected readonly logger = new Logger(PlatformaticKafkaClient.name);
  protected responsePatterns: string[] = [];
  protected consumerAssignments: Record<string, number> = {};
  protected clientId: string;
  protected groupId: string;
  protected producerOnlyMode: boolean;
  protected _consumer: KafkaConsumer | null = null;
  protected _producer: KafkaProducer | null = null;
  private responseStream: ResponseMessagesStream | null = null;
  private clientClosed = false;
  private clientConnecting = false;
  private _clientCloseResolve: (() => void) | undefined;
  private readonly _clientCloseSignal: Promise<void>;
  private currentStatus: PlatformaticKafkaStatus = PlatformaticKafkaStatus.DISCONNECTED;
  private readonly queue = new SerialQueue();

  get consumer(): KafkaConsumer {
    if (!this._consumer) throw new Error('No consumer initialized. Call "connect" first.');
    return this._consumer;
  }

  get producer(): KafkaProducer {
    if (!this._producer) throw new Error('No producer initialized. Call "connect" first.');
    return this._producer;
  }

  constructor(protected readonly options: PlatformaticKafkaOptions) {
    super();
    this._clientCloseSignal = new Promise<void>(resolve => { this._clientCloseResolve = resolve; });
    this.initializeSerializer(undefined);
    this.initializeDeserializer(undefined);
    this._status$.subscribe((s) => { this.currentStatus = s; });
    const postfixId = resolvePostfixId(options.postfixId, DEFAULT_POSTFIX_CLIENT);
    this.producerOnlyMode = this.getOptionsProp(options, "producerOnlyMode", false);
    this.clientId = (options.clientId ?? KAFKA_DEFAULT_CLIENT) + postfixId;
    this.groupId = resolveKafkaGroupId(options.groupId, KAFKA_DEFAULT_GROUP, postfixId);
  }

  public getStatus(): PlatformaticKafkaStatus {
    return this.currentStatus;
  }

  public subscribeToResponseOf(pattern: unknown): void {
    const request = this.normalizePattern(pattern as MsPattern);
    this.responsePatterns.push(this.getResponsePatternName(request));
  }

  public async close(): Promise<void> {
    this.clientClosed = true;
    this._clientCloseResolve?.();
    const timeout = this.options.shutdownTimeoutMs;
    if (timeout) {
      await Promise.race([
        this.queue.idle(),
        sleepMs(timeout).then(() =>
          this.logger.warn(`Shutdown timeout (${timeout}ms) exceeded, forcing close`),
        ),
      ]);
    } else {
      await this.queue.idle();
    }
    await this.queue.enqueue(() => this.disposeClientTransport());
  }

  public async connect(): Promise<KafkaProducer> {
    if (this.clientClosed) throw new Error("Client is closed");
    await this.queue.enqueue(async () => {
      if (this._producer) return;
      await this.connectWithBackoff();
    });
    return this.producer;
  }

  public async handleMessage(payload: PlatformaticKafkaMessage): Promise<void> {
    if (isUndefined(payload.headers.get(KafkaHeaders.CORRELATION_ID))) return;
    const { err, response, isDisposed, id } = this.deserialize(payload);
    const callback = this.routingMap.get(id);
    if (!callback) return;
    callback(err || isDisposed ? { err, response, isDisposed } : { err, response });
  }

  public getConsumerAssignments(): Record<string, number> {
    return this.consumerAssignments;
  }

  public emitBatch<TInput>(
    pattern: MsPattern,
    data: { messages: TInput[] },
  ): Observable<void> {
    if (isNil(pattern) || isNil(data)) {
      return throwError(() => new InvalidMessageException());
    }
    const source = defer(async () => this.connect()).pipe(
      mergeMap(() => this.dispatchBatchEvent({ pattern, data })),
    );
    const connectableSource = connectable(source, {
      connector: () => new Subject<void>(),
      resetOnDisconnect: false,
    });
    connectableSource.connect();
    return connectableSource;
  }

  public unwrap<T = [KafkaConsumer | null, KafkaProducer | null]>(): T {
    return [this._consumer, this._producer] as unknown as T;
  }

  public on(_event: string | number | symbol, _callback: (...args: unknown[]) => void): void {
    throw new Error('Method not supported. Register events via the "consumer" and "producer" attributes.');
  }

  private async connectWithBackoff(): Promise<void> {
    if (this.clientClosed) throw new Error("Client is closed");
    this.clientConnecting = true;
    try {
    await runWithBackoff(
      this.options.reconnect,
      () => this.clientClosed,
      async () => {
        await this.disposeClientTransport();
        if (!this.producerOnlyMode) {
          this._consumer = createKafkaConsumer(this.options, this.clientId, this.groupId);
          registerClientEventListeners(this._consumer, this._status$, () =>
            this.scheduleClientReconnect(),
          );
          this._consumer.on("consumer:group:join", this.setConsumerAssignments.bind(this));
          await this.attachResponseStream();
        }
        this._producer = createKafkaProducer(this.options, this.clientId);
        registerClientEventListeners(this._producer, this._status$, () =>
          this.scheduleClientReconnect(),
        );
        if (this.producerOnlyMode || !this.responsePatterns.length) {
          const pings = [ensureBootstrapMetadata(this._producer)];
          if (this._consumer) pings.push(ensureBootstrapMetadata(this._consumer));
          await Promise.all(pings);
        }
      },
      (delay, err) => this.logger.warn(`Kafka client unavailable, retry in ${delay}ms: ${formatError(err)}`),
      this._clientCloseSignal,
    );
    if (this.clientClosed) return; // close() called during connection — disposeClientTransport() will clean up
    } finally {
      this.clientConnecting = false;
    }
  }

  private scheduleClientReconnect(): void {
    if (this.clientClosed || this.clientConnecting) return;
    void this.queue
      .enqueue(async () => {
        if (this.clientClosed) return;
        this.logger.warn("Kafka client connection failure, reconnecting");
        await this.connectWithBackoff();
      })
      .catch((err: unknown) => this.logger.error(err));
  }

  private async attachResponseStream(): Promise<void> {
    if (!this._consumer || !this.responsePatterns.length) return;

    const stream = await this._consumer.consume({
      autocommit: true,
      sessionTimeout: 10000,
      heartbeatInterval: 500,
      maxWaitTime: 500,
      rebalanceTimeout: 15000,
      topics: this.responsePatterns,
      ...DEFAULT_PLATFORMATIC_STREAM_CONSUME,
      ...this.options.consumeOptions,
    });
    this.responseStream = stream;
    stream.on("data", (message: PlatformaticKafkaMessage) => {
      void this.handleMessage(message);
    });
    stream.on("error", (error: Error) => {
      this.logger.error(error.message);
      this.scheduleClientReconnect();
    });
  }

  private async disposeClientTransport(): Promise<void> {
    if (this.responseStream) {
      try { await this.responseStream.close(); } catch {}
      this.responseStream = null;
    }
    await closeKafkaClients(this._consumer, this._producer);
    this._consumer = null;
    this._producer = null;
  }

  private produce(messages: MessageToProduce<string, string, string, string>[]): Promise<unknown> {
    return this.queue.enqueue(() =>
      this.producer.send({ autocreateTopics: true, ...this.options.produceOptions, messages }),
    );
  }

  protected async dispatchBatchEvent(
    packets: ReadPacket<{ messages: unknown[] }>,
  ): Promise<void> {
    if (!packets.data.messages.length) return;
    const topic = this.normalizePattern(packets.pattern);
    await this.produce(
      packets.data.messages.map((message) => {
        const { value, key, headers } = buildEmitMessageParts(message);
        return { topic, value, ...(key !== undefined && { key }), ...(headers && { headers }) };
      }),
    );
  }

  protected async dispatchEvent<T = unknown>(packet: ReadPacket): Promise<T> {
    const { value, key, headers } = buildEmitMessageParts(packet.data);
    await this.produce([{
      topic: this.normalizePattern(packet.pattern),
      value,
      ...(key !== undefined && { key }),
      ...(headers && { headers }),
    }]);
    return undefined as T;
  }

  protected getReplyTopicPartition(topic: string): string {
    const partition = this.consumerAssignments[topic];
    if (typeof partition === "undefined") throw new InvalidKafkaClientTopicException(topic);
    return partition.toString();
  }

  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => void,
  ): () => void {
    const packet = this.assignPacketId(partialPacket);
    this.routingMap.set(packet.id, callback);
    const cleanup = () => { this.routingMap.delete(packet.id); };
    const errorCallback = (err: unknown) => { cleanup(); callback({ err }); };

    void this.queue
      .enqueue(async () => {
        try {
          const pattern = this.normalizePattern(partialPacket.pattern);
          const replyTopic = this.getResponsePatternName(pattern);
          const replyPartition = this.getReplyTopicPartition(replyTopic);
          await this.producer.send({
            autocreateTopics: true,
            ...this.options.produceOptions,
            messages: [{
              topic: pattern,
              value: JSON.stringify(packet.data),
              headers: {
                [KafkaHeaders.CORRELATION_ID]: packet.id,
                [KafkaHeaders.REPLY_TOPIC]: replyTopic,
                [KafkaHeaders.REPLY_PARTITION]: replyPartition,
              },
            }],
          });
        } catch (err) {
          errorCallback(err);
        }
      })
      .catch(errorCallback);
    return cleanup;
  }

  protected getResponsePatternName(pattern: string): string {
    return `${pattern}.reply`;
  }

  protected setConsumerAssignments(data: ConsumerGroupJoinPayload): void {
    const result: Record<string, number> = {};
    for (const { topic, partitions } of data.assignments ?? []) {
      if (partitions.length > 0) result[topic] = Math.min(...partitions);
    }
    this.consumerAssignments = result;
  }

  protected deserialize(message: PlatformaticKafkaMessage): IncomingResponse {
    const id = message.headers.get(KafkaHeaders.CORRELATION_ID)?.toString() ?? "";
    if (!isUndefined(message.headers.get(KafkaHeaders.NEST_ERR))) {
      return { id, err: message.headers.get(KafkaHeaders.NEST_ERR), isDisposed: true };
    }
    if (!isUndefined(message.headers.get(KafkaHeaders.NEST_IS_DISPOSED))) {
      return { id, response: message.value, isDisposed: true };
    }
    return { id, response: message.value, isDisposed: false };
  }
}
