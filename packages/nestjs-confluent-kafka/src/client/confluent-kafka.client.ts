import { Logger } from "@nestjs/common";
import { isNil, isUndefined } from "@nestjs/common/utils/shared.utils";
import {
  ClientProxy,
  IncomingResponse,
  MsPattern,
  ReadPacket,
  WritePacket,
} from "@nestjs/microservices";
import { KafkaHeaders } from "@nestjs/microservices/enums";
import { InvalidKafkaClientTopicException } from "@nestjs/microservices/errors/invalid-kafka-client-topic.exception";
import { InvalidMessageException } from "@nestjs/microservices/errors/invalid-message.exception";
import { connectable, defer, mergeMap, Observable, Subject, throwError } from "rxjs";
import { DEFAULT_POSTFIX_CLIENT } from "../constants/confluent-kafka.constants";
import { formatError, runWithBackoff, sleepMs } from "../utils/confluent-kafka-reconnect";
import type {
  ConfluentKafkaConsumer,
  ConfluentKafkaMessage,
  ConfluentKafkaOptions,
  ConfluentKafkaProducer,
  ConfluentKafkaStatus,
} from "../types/confluent-kafka.types";
import {
  buildEmitMessageParts,
  commitOffset,
  createKafkaConsumer,
  createKafkaInstance,
  createKafkaProducer,
  disconnectKafkaClients,
  emitConnected,
  emitDisconnected,
  emitFailed,
  headersToMap,
  resolveDefaultClientAndGroup,
  SerialQueue,
} from "../utils/confluent-kafka.utils";

export class ConfluentKafkaClient extends ClientProxy<
  Record<never, never>,
  ConfluentKafkaStatus
> {
  protected readonly logger = new Logger(ConfluentKafkaClient.name);
  protected responsePatterns: string[] = [];
  protected consumerAssignments: Record<string, number> = {};
  protected clientId: string;
  protected groupId: string;
  protected producerOnlyMode: boolean;
  protected _consumer: ConfluentKafkaConsumer | null = null;
  protected _producer: ConfluentKafkaProducer | null = null;
  private clientClosed = false;
  private clientConnecting = false;
  private currentStatus: ConfluentKafkaStatus;
  private readonly queue = new SerialQueue();

  get consumer(): ConfluentKafkaConsumer {
    if (!this._consumer) throw new Error('No consumer initialized. Call "connect" first.');
    return this._consumer;
  }

  get producer(): ConfluentKafkaProducer {
    if (!this._producer) throw new Error('No producer initialized. Call "connect" first.');
    return this._producer;
  }

  constructor(protected readonly options: ConfluentKafkaOptions) {
    super();
    this.initializeSerializer(undefined);
    this.initializeDeserializer(undefined);
    const { clientId, groupId } = resolveDefaultClientAndGroup(options, DEFAULT_POSTFIX_CLIENT);
    this.clientId = clientId;
    this.groupId = groupId;
    this.producerOnlyMode = this.getOptionsProp(options, "producerOnlyMode", false);
    this._status$.subscribe((s) => { this.currentStatus = s; });
    this.currentStatus = undefined as unknown as ConfluentKafkaStatus;
  }

  public getStatus(): ConfluentKafkaStatus {
    return this.currentStatus;
  }

  public subscribeToResponseOf(pattern: unknown): void {
    const request = this.normalizePattern(pattern as MsPattern);
    this.responsePatterns.push(this.getResponsePatternName(request));
  }

  public async close(): Promise<void> {
    this.clientClosed = true;
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

  public async connect(): Promise<ConfluentKafkaProducer> {
    if (this.clientClosed) throw new Error("Client is closed");
    await this.queue.enqueue(async () => {
      if (this._producer) return;
      await this.connectWithBackoff();
    });
    return this.producer;
  }

  public async handleMessage(payload: ConfluentKafkaMessage): Promise<void> {
    const correlationId = payload.headers.get(KafkaHeaders.CORRELATION_ID);
    if (isUndefined(correlationId)) return;
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

  public unwrap<T = [ConfluentKafkaConsumer | null, ConfluentKafkaProducer | null]>(): T {
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
          const kafka = createKafkaInstance(this.options, this.clientId);
          if (!this.producerOnlyMode) {
            this._consumer = createKafkaConsumer(kafka, this.options, this.groupId);
            await this._consumer.connect();
            await this.attachResponseStream();
          }
          this._producer = createKafkaProducer(kafka, this.options);
          await this._producer.connect();
          emitConnected(this._status$);
        },
        (delay, err) => this.logger.warn(`Kafka client unavailable, retry in ${delay}ms: ${formatError(err)}`),
      );
      if (this.clientClosed) return;
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

    await this._consumer.subscribe({ topics: this.responsePatterns });

    this._consumer.run({
      autoCommit: true,
      eachMessage: async ({ topic, partition, message }) => {
        const headers = headersToMap(message.headers as Record<string, Buffer | string | null | undefined>);
        const msg: ConfluentKafkaMessage = {
          topic,
          partition,
          offset: message.offset,
          key: message.key != null ? message.key.toString() : null,
          value: message.value != null ? message.value.toString() : "null",
          headers,
          commit: () => commitOffset(this.consumer, topic, partition, message.offset),
          heartbeat: async () => {},
        };
        await this.handleMessage(msg);
      },
    }).catch((err: unknown) => {
      emitFailed(this._status$);
      this.logger.error(`Response stream error: ${formatError(err)}`);
      this.scheduleClientReconnect();
    });
  }

  private async disposeClientTransport(): Promise<void> {
    await disconnectKafkaClients(this._consumer, this._producer);
    this._consumer = null;
    this._producer = null;
    emitDisconnected(this._status$);
  }

  private produce(messages: Array<{ topic: string; messages: Array<{ key?: string; value: string; headers?: Record<string, string> }> }>): Promise<unknown> {
    return this.queue.enqueue(async () => {
      for (const record of messages) {
        await this.producer.send(record);
      }
    });
  }

  protected async dispatchBatchEvent(
    packets: ReadPacket<{ messages: unknown[] }>,
  ): Promise<void> {
    if (!packets.data.messages.length) return;
    const topic = this.normalizePattern(packets.pattern);
    await this.produce(
      packets.data.messages.map((message) => {
        const { value, key, headers } = buildEmitMessageParts(message);
        return {
          topic,
          messages: [{ value, ...(key !== undefined && { key }), ...(headers && { headers }) }],
        };
      }),
    );
  }

  protected async dispatchEvent<T = unknown>(packet: ReadPacket): Promise<T> {
    const { value, key, headers } = buildEmitMessageParts(packet.data);
    await this.producer.send({
      topic: this.normalizePattern(packet.pattern),
      messages: [{ value, ...(key !== undefined && { key }), ...(headers && { headers }) }],
    });
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
            topic: pattern,
            messages: [{
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

  protected setConsumerAssignments(memberAssignment: Record<string, number[]>): void {
    const result: Record<string, number> = {};
    for (const [topic, partitions] of Object.entries(memberAssignment)) {
      if (partitions.length > 0) result[topic] = Math.min(...partitions);
    }
    this.consumerAssignments = result;
  }

  protected deserialize(message: ConfluentKafkaMessage): IncomingResponse {
    const id = message.headers.get(KafkaHeaders.CORRELATION_ID) ?? "";
    if (!isUndefined(message.headers.get(KafkaHeaders.NEST_ERR))) {
      return { id, err: message.headers.get(KafkaHeaders.NEST_ERR), isDisposed: true };
    }
    if (!isUndefined(message.headers.get(KafkaHeaders.NEST_IS_DISPOSED))) {
      return { id, response: message.value, isDisposed: true };
    }
    return { id, response: message.value, isDisposed: false };
  }
}
