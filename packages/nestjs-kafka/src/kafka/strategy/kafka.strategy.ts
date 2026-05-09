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
import { KafkaJS } from "@confluentinc/kafka-javascript";
import {
  firstValueFrom,
  isObservable,
  Observable,
  ReplaySubject,
  Subscription,
} from "rxjs";
import { KafkaContext, headersToMap } from "../context/kafka.context";
import { deserializeJson, serializeJson } from "../utils/json.utils";
import { hasSslConfig, toConsumerRdKafkaConfig, toGlobalRdKafkaConfig, toProducerRdKafkaConfig } from "../utils/rdkafka-config";
import { sleepMs } from "../utils/kafka-reconnect";
import {
  applyPostfix,
  DEFAULT_POSTFIX_SERVER,
  DEFAULT_RETRY_DELAY_MS,
} from "../constants/kafka.constants";
import type { KafkaOptions, KafkaStatus } from "../types/kafka.types";
import { KafkaStatus as Status } from "../types/kafka.types";

export class KafkaStrategy
  extends Server<never, KafkaStatus>
  implements CustomTransportStrategy
{
  readonly transportId = Transport.KAFKA;
  protected readonly logger = new Logger(KafkaStrategy.name);

  private consumer: KafkaJS.Consumer | undefined;
  private producer: KafkaJS.Producer | undefined;
  private closed = false;
  private currentStatus: KafkaStatus = Status.DISCONNECTED;

  constructor(private readonly options: KafkaOptions) {
    super();
    this._status$.subscribe((s) => {
      this.currentStatus = s;
    });
  }

  public getStatus(): KafkaStatus {
    return this.currentStatus;
  }

  public async listen(callback: (err?: unknown) => void): Promise<void> {
    this.closed = false;
    try {
      const { clientId, groupId } = applyPostfix(this.options, DEFAULT_POSTFIX_SERVER);
      const kafka = this.createKafka(clientId);
      this.consumer = kafka.consumer({
        ...toConsumerRdKafkaConfig(this.options.consumerRdKafka),
        kafkaJS: {
          groupId,
          autoCommit: false,
          ...(this.options.consumer ?? {}),
        },
      });
      this.producer = kafka.producer({
        ...toProducerRdKafkaConfig(this.options.producerRdKafka),
        ...(this.options.producer ? { kafkaJS: this.options.producer } : {}),
      });

      await this.consumer.connect();
      await this.producer.connect();
      this._status$.next(Status.CONNECTED);

      const topics = [...this.messageHandlers.keys()];
      if (topics.length > 0) {
        await this.consumer.subscribe({ topics });
        void this.consumer.run({
          eachMessage: async (payload) => this.processMessage(payload),
        });
      }

      callback();
    } catch (err) {
      this._status$.next(Status.FAILED);
      callback(err);
    }
  }

  public async close(): Promise<void> {
    this.logger.log("Closing Kafka transport...");
    this.closed = true;
    try {
      await this.consumer?.stop();
    } catch {}
    await Promise.allSettled([
      this.consumer?.disconnect(),
      this.producer?.disconnect(),
    ]);
    this._status$.next(Status.DISCONNECTED);
    this.consumer = undefined;
    this.producer = undefined;
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
        ...(clientId !== undefined && { clientId }),
        ...(sslEnabled && { ssl: true }),
        ...(this.options.sasl !== undefined && { sasl: this.options.sasl }),
      },
    });
  }

  private async processMessage(
    payload: KafkaJS.EachMessagePayload,
  ): Promise<void> {
    const { topic, partition, message, heartbeat } = payload;
    const headers = "headers" in message ? message.headers : undefined;
    const headersMap = headersToMap(headers);

    const correlationId = headersMap.get(KafkaHeaders.CORRELATION_ID);
    const replyTopic = headersMap.get(KafkaHeaders.REPLY_TOPIC);
    const handler = this.getHandlerByPattern(topic);

    const commit = () => this.commitOffset(topic, partition, message.offset);

    if (handler?.isEventHandler || !correlationId || !replyTopic) {
      await this.handleEventMessage(
        topic,
        partition,
        message,
        headers,
        commit,
        heartbeat,
      );
    } else {
      await this.handleRpcMessage(
        topic,
        partition,
        message,
        headers,
        correlationId,
        replyTopic,
        headersMap.get(KafkaHeaders.REPLY_PARTITION),
        commit,
      );
    }
  }

  private async commitOffset(
    topic: string,
    partition: number,
    offset: string,
  ): Promise<void> {
    await this.consumer!.commitOffsets([
      { topic, partition, offset: (BigInt(offset) + 1n).toString() },
    ]);
  }

  private async handleEventMessage(
    topic: string,
    partition: number,
    message: KafkaJS.KafkaMessage,
    headers: KafkaJS.IHeaders | undefined,
    commit: () => Promise<void>,
    heartbeat: () => Promise<void>,
  ): Promise<void> {
    const maxRetries = this.options.maxRetries ?? Infinity;
    let failures = 0;
    let lastError: unknown = null;

    while (!this.closed) {
      let nackDelay: number | null = null;
      const nack = (delayMs = DEFAULT_RETRY_DELAY_MS) => {
        nackDelay = delayMs;
      };

      const ctx = new KafkaContext(
        message,
        partition,
        topic,
        headers,
        commit,
        nack,
      );
      const data = deserializeJson(message.value);

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
        nackDelay = DEFAULT_RETRY_DELAY_MS;
      }

      if (nackDelay === null) {
        try {
          await commit();
        } catch (err) {
          this.logger.error(err);
        }
        return;
      }

      failures++;
      if (failures > maxRetries) {
        await this.sendToDlq(topic, partition, message, headers, lastError, failures);
        try {
          await commit();
        } catch {}
        return;
      }

      this.logger.warn(
        `Retrying "${topic}" in ${nackDelay}ms` +
          (isFinite(maxRetries) ? ` (${failures}/${maxRetries})` : ""),
      );

      await this.sleepWithHeartbeat(nackDelay, heartbeat);
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
    commit: () => Promise<void>,
  ): Promise<void> {
    const nack = () => {};
    const ctx = new KafkaContext(message, partition, topic, headers, commit, nack);
    const publish = (data: WritePacket) =>
      this.sendReply(data, replyTopic, replyPartition, correlationId);
    const handler = this.getHandlerByPattern(topic);

    if (!handler) {
      await publish({ err: NO_MESSAGE_HANDLER });
      await commit();
      return;
    }

    try {
      const value = deserializeJson(message.value);
      const response$ = this.transformToObservable(
        handler(value, ctx),
      );
      const replay$ = new ReplaySubject<unknown>();
      await this.combineStreamsAndThrowIfRetriable(response$, replay$);
      this.send(replay$, publish);
      await commit();
    } catch (err) {
      this.logger.error(err);
      await publish({ err });
    }
  }

  private async sendToDlq(
    topic: string,
    partition: number,
    message: KafkaJS.KafkaMessage,
    headers: KafkaJS.IHeaders | undefined,
    error: unknown,
    failures: number,
  ): Promise<void> {
    const dlqTopic = this.options.deadLetterTopic;
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
          if (!(k in dlqHeaders) && v !== undefined) dlqHeaders[k] = v;
        }
      }
      await this.producer!.send({
        topic: dlqTopic,
        messages: [{ key: message.key, value: message.value, headers: dlqHeaders }],
      });
      this.logger.warn(`"${topic}" → DLQ "${dlqTopic}" after ${failures} failure(s)`);
    } catch (err) {
      this.logger.error(`Failed to send to DLQ "${dlqTopic}":`, err);
    }
  }

  private sendReply(
    message: WritePacket,
    replyTopic: string,
    replyPartition: string | undefined,
    correlationId: string,
  ): Promise<KafkaJS.RecordMetadata[]> {
    const headers: KafkaJS.IHeaders = {
      [KafkaHeaders.CORRELATION_ID]: correlationId,
    };
    if (message.err) {
      headers[KafkaHeaders.NEST_ERR] = serializeJson(message.err);
    }
    if (message.isDisposed) {
      headers[KafkaHeaders.NEST_IS_DISPOSED] = "1";
    }
    const msg: KafkaJS.Message = {
      value: serializeJson(message.response ?? null),
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

  private async sleepWithHeartbeat(
    ms: number,
    heartbeat: () => Promise<void>,
  ): Promise<void> {
    const interval = 1000;
    const end = Date.now() + ms;
    while (Date.now() < end && !this.closed) {
      await heartbeat().catch(() => {});
      const remaining = end - Date.now();
      if (remaining > 0) await sleepMs(Math.min(interval, remaining));
    }
  }
}
