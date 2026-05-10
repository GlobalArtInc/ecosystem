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
import { KafkaJS } from "@confluentinc/kafka-javascript";
import { Observable, Subject, connectable, defer, mergeMap, throwError } from "rxjs";
import type { KafkaOptions, KafkaStatus } from "../types/kafka.types";
import { KafkaStatus as Status } from "../types/kafka.types";
import { headersToMap } from "../context/kafka.context";
import { deserializeJson, serializeJson } from "../utils/json.utils";
import { hasSslConfig, toConsumerRdKafkaConfig, toGlobalRdKafkaConfig, toProducerRdKafkaConfig } from "../utils/rdkafka-config";

/** NestJS ClientProxy implementation for sending messages and events over Kafka. */
export class KafkaClient extends ClientProxy<Record<never, never>, KafkaStatus> {
  protected readonly logger = new Logger(KafkaClient.name);
  protected responsePatterns: string[] = [];
  protected consumerAssignments: Record<string, number> = {};

  private _consumer: KafkaJS.Consumer | null = null;
  private _producer: KafkaJS.Producer | null = null;
  private connected = false;

  constructor(protected readonly options: KafkaOptions) {
    super();
    this.initializeSerializer(undefined);
    this.initializeDeserializer(undefined);
  }

  get producer(): KafkaJS.Producer {
    if (!this._producer) throw new Error("Client not connected. Call connect() first.");
    return this._producer;
  }

  public getStatus(): KafkaStatus {
    return this.connected ? Status.CONNECTED : Status.DISCONNECTED;
  }

  public subscribeToResponseOf(pattern: unknown): void {
    const request = this.normalizePattern(pattern as MsPattern);
    this.responsePatterns.push(this.getResponsePatternName(request));
  }

  public async connect(): Promise<KafkaJS.Producer> {
    if (this.connected) return this.producer;

    const kafka = this.createKafka();

    if (!this.options.producerOnlyMode) {
      this._consumer = kafka.consumer({
        ...toConsumerRdKafkaConfig(this.options.consumerRdKafka),
        kafkaJS: {
          groupId: `${this.options.groupId}-client`,
          autoCommit: true,
          ...(this.options.consumer ?? {}),
        },
      });
      await this._consumer.connect();

      if (this.responsePatterns.length > 0) {
        await this._consumer.subscribe({ topics: this.responsePatterns });
        void this._consumer.run({
          eachMessage: async ({ topic, message }) =>
            this.handleResponseMessage(topic, message),
        });
      }
    }

    this._producer = kafka.producer({
      ...toProducerRdKafkaConfig(this.options.producerRdKafka),
      ...(this.options.producer ? { kafkaJS: this.options.producer } : {}),
    });
    await this._producer.connect();
    this.connected = true;
    this._status$.next(Status.CONNECTED);

    return this._producer;
  }

  public async close(): Promise<void> {
    await Promise.allSettled([
      this._consumer?.disconnect(),
      this._producer?.disconnect(),
    ]);
    this._consumer = null;
    this._producer = null;
    this.connected = false;
    this._status$.next(Status.DISCONNECTED);
  }

  public on(
    _event: string | number | symbol,
    _callback: (...args: unknown[]) => void,
  ): void {
    throw new Error(
      'Method not supported. Use unwrap() to access consumer/producer.',
    );
  }

  public unwrap<T = [KafkaJS.Consumer | null, KafkaJS.Producer | null]>(): T {
    return [this._consumer, this._producer] as unknown as T;
  }

  public emitBatch<TInput>(
    pattern: MsPattern,
    data: { messages: TInput[] },
  ): Observable<void> {
    if (isNil(pattern) || isNil(data)) {
      return throwError(() => new InvalidMessageException());
    }
    const source = defer(() => this.connect()).pipe(
      mergeMap(() => this.dispatchBatchEvent({ pattern, data })),
    );
    const connectableSource = connectable(source, {
      connector: () => new Subject<void>(),
      resetOnDisconnect: false,
    });
    connectableSource.connect();
    return connectableSource;
  }

  protected async dispatchEvent<T = unknown>(packet: ReadPacket): Promise<T> {
    await this.connect();
    const topic = this.normalizePattern(packet.pattern);
    await this.producer.send({
      topic,
      messages: [{ value: serializeJson(packet.data) }],
    });
    return undefined as T;
  }

  protected async dispatchBatchEvent(
    packets: ReadPacket<{ messages: unknown[] }>,
  ): Promise<void> {
    if (!packets.data.messages.length) return;
    const topic = this.normalizePattern(packets.pattern);
    await this.producer.send({
      topic,
      messages: packets.data.messages.map((msg) => ({
        value: serializeJson(msg),
      })),
    });
  }

  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => void,
  ): () => void {
    const packet = this.assignPacketId(partialPacket);
    this.routingMap.set(packet.id, callback);
    const cleanup = () => {
      this.routingMap.delete(packet.id);
    };
    const errorCallback = (err: unknown) => {
      cleanup();
      callback({ err });
    };

    void this.connect()
      .then(async () => {
        try {
          const pattern = this.normalizePattern(partialPacket.pattern);
          const replyTopic = this.getResponsePatternName(pattern);
          const replyPartition = this.getReplyTopicPartition(replyTopic);
          await this.producer.send({
            topic: pattern,
            messages: [
              {
                value: serializeJson(packet.data),
                headers: {
                  [KafkaHeaders.CORRELATION_ID]: packet.id,
                  [KafkaHeaders.REPLY_TOPIC]: replyTopic,
                  [KafkaHeaders.REPLY_PARTITION]: replyPartition,
                },
              },
            ],
          });
        } catch (err) {
          errorCallback(err);
        }
      })
      .catch(errorCallback);

    return cleanup;
  }

  private async handleResponseMessage(
    _topic: string,
    message: KafkaJS.KafkaMessage,
  ): Promise<void> {
    const headers = "headers" in message ? message.headers : undefined;
    const headersMap = headersToMap(headers);
    const correlationId = headersMap.get(KafkaHeaders.CORRELATION_ID);
    if (isUndefined(correlationId)) return;

    const callback = this.routingMap.get(correlationId);
    if (!callback) return;

    const { err, response, isDisposed } = this.deserializeResponse(headersMap, message);
    callback(err || isDisposed ? { err, response, isDisposed } : { err, response });
  }

  private deserializeResponse(
    headersMap: Map<string, string>,
    message: KafkaJS.KafkaMessage,
  ): IncomingResponse {
    const id = headersMap.get(KafkaHeaders.CORRELATION_ID) ?? "";
    if (!isUndefined(headersMap.get(KafkaHeaders.NEST_ERR))) {
      return { id, err: headersMap.get(KafkaHeaders.NEST_ERR), isDisposed: true };
    }
    if (!isUndefined(headersMap.get(KafkaHeaders.NEST_IS_DISPOSED))) {
      return { id, response: deserializeJson(message.value), isDisposed: true };
    }
    return { id, response: deserializeJson(message.value), isDisposed: false };
  }

  protected getResponsePatternName(pattern: string): string {
    return `${pattern}.reply`;
  }

  protected getReplyTopicPartition(topic: string): string {
    const partition = this.consumerAssignments[topic];
    if (typeof partition === "undefined") {
      throw new InvalidKafkaClientTopicException(topic);
    }
    return partition.toString();
  }

  private createKafka(): KafkaJS.Kafka {
    const { ssl, rdKafka } = this.options;
    const sslEnabled = ssl ?? hasSslConfig(rdKafka);
    return new KafkaJS.Kafka({
      ...toGlobalRdKafkaConfig(rdKafka),
      kafkaJS: {
        brokers: this.options.brokers,
        ...(this.options.clientId && { clientId: this.options.clientId }),
        ...(sslEnabled && { ssl: true }),
        ...(this.options.sasl && { sasl: this.options.sasl }),
      },
    });
  }
}
