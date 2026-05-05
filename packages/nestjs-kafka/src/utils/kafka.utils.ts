import {
  type Broker,
  Consumer,
  type ConnectionOptions,
  type ConsumerGroupJoinPayload,
  Producer,
  stringSerializer,
  stringDeserializer,
} from "@platformatic/kafka";
import type { Logger } from "@nestjs/common";
import { Subject } from "rxjs";
import type {
  KafkaConsumer,
  KafkaProducer,
  KafkaClientEvent,
  KafkaMessage,
  KafkaOptions,
  KafkaStatus,
} from "../types/kafka.types";
import { KafkaStatus as Status } from "../types/kafka.types";
import { DEFAULT_KAFKA_METADATA_MAX_AGE_MS } from "../constants/kafka.constants";
import { sleepMs } from "./kafka-reconnect";
import { deserializeJson, serializeJson } from "./json.utils";

type KafkaClientLike = {
  on(event: KafkaClientEvent, handler: () => void): unknown;
  on(event: "error", handler: (err: Error) => void): unknown;
};

/** @internal */
export function resolveKafkaGroupId(
  configured: string | undefined | null,
  defaultGroup: string,
  postfix: string,
): string {
  return `${configured?.length ? configured : defaultGroup}${postfix}`;
}

/** @internal */
export function resolvePostfixId(
  configured: string | undefined | null,
  fallback: string,
): string {
  return configured?.length ? configured : fallback;
}

function isNonEmptyTlsConfig(
  value: ConnectionOptions["tls"] | ConnectionOptions["ssl"],
): value is NonNullable<ConnectionOptions["tls"]> {
  return (
    value !== undefined &&
    typeof value === "object" &&
    Object.keys(value).length > 0
  );
}

/** Extracts the hostname from a bootstrap broker address string or Broker object. */
export function brokerHostnameFromBootstrap(
  broker: string | Broker,
): string | undefined {
  if (typeof broker !== "string") {
    return broker.host.length > 0 ? broker.host : undefined;
  }
  const s = broker;
  if (s.startsWith("[")) {
    const end = s.indexOf("]:");
    if (end === -1) {
      return s.length > 2 ? s.slice(1, -1) : undefined;
    }
    return s.slice(1, end);
  }
  const lastColon = s.lastIndexOf(":");
  if (lastColon === -1) {
    return s.length > 0 ? s : undefined;
  }
  const after = s.slice(lastColon + 1);
  return /^\d+$/.test(after) ? s.slice(0, lastColon) : s;
}

/** @internal */
export function resolveConnectionOptions(
  connection: ConnectionOptions | undefined,
  brokers?: string[] | Broker[],
): ConnectionOptions | undefined {
  if (!connection) return undefined;
  const { ssl, tls, ...rest } = connection;
  const effectiveTls = isNonEmptyTlsConfig(tls)
    ? tls
    : isNonEmptyTlsConfig(ssl)
      ? ssl
      : undefined;
  if (!effectiveTls) {
    return Object.keys(rest).length > 0 ? { ...rest } : undefined;
  }
  const base: ConnectionOptions = { ...rest, tls: effectiveTls };
  if (
    base.tlsServerName === undefined &&
    brokers !== undefined &&
    brokers.length > 0
  ) {
    return {
      ...base,
      tlsServerName: true,
    };
  }
  return base;
}

/** Serializes async operations into a strict FIFO queue so that operations never interleave. */
export class SerialQueue {
  private tail: Promise<void> = Promise.resolve();
  private _pending = 0;

  get pending(): number {
    return this._pending;
  }

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    this._pending++;
    const next = this.tail.then(() => fn());
    this.tail = next.then(
      () => {
        this._pending--;
      },
      () => {
        this._pending--;
      },
    );
    return next;
  }

  idle(): Promise<void> {
    return this.tail;
  }
}

/** @internal */
export function registerClientEventListeners(
  client: KafkaClientLike,
  status$: Subject<KafkaStatus>,
  onFailed: () => void,
): void {
  client.on("client:broker:connect", () => status$.next(Status.CONNECTED));
  client.on("client:broker:disconnect", () =>
    status$.next(Status.DISCONNECTED),
  );
  client.on("client:broker:failed", () => {
    status$.next(Status.FAILED);
    onFailed();
  });
  client.on("error", () => {
    status$.next(Status.FAILED);
    onFailed();
  });
}

const CLOSE_TIMEOUT_MS = 5000;

export async function closeKafkaClients(
  consumer: KafkaConsumer | null | undefined,
  producer: KafkaProducer | null | undefined,
  forceCloseConsumer = false,
): Promise<void> {
  const tryClose = (
    client: KafkaConsumer | KafkaProducer,
    force?: boolean,
  ): Promise<void> =>
    Promise.resolve(client.close(force)).catch(() => undefined);

  const withTimeout = (p: Promise<void>): Promise<void> =>
    Promise.race([p, sleepMs(CLOSE_TIMEOUT_MS)]);

  const closeConsumer = async (): Promise<void> => {
    if (!consumer) return;
    await Promise.resolve();
    if (forceCloseConsumer) {
      await withTimeout(tryClose(consumer, true));
      return;
    }
    await withTimeout(
      Promise.resolve(consumer.close(false)).catch(() =>
        tryClose(consumer, true),
      ),
    );
  };

  await Promise.all([
    closeConsumer(),
    producer ? withTimeout(tryClose(producer)) : Promise.resolve(),
  ]);
}

/** @internal */
export function ensureBootstrapMetadata(
  client: KafkaConsumer | KafkaProducer,
): Promise<void> {
  return client.metadata({ topics: [] }).then(() => undefined);
}

/** @internal */
export function createKafkaConsumer(
  options: KafkaOptions,
  clientId: string,
  groupId: string,
): KafkaConsumer {
  const resolvedConnection = resolveConnectionOptions(
    options.connection,
    options.brokers,
  );

  return new Consumer({
    groupId,
    clientId,
    bootstrapBrokers: options.brokers,
    maxWaitTime: 1000,
    autocommit: 100,
    deserializers: {
      headerKey: stringDeserializer,
      headerValue: stringDeserializer,
      key: deserializeJson,
      value: deserializeJson,
    },
    autocreateTopics: true,
    timeout: 30000,
    connectTimeout: 10000,
    retries: 0,
    ...(resolvedConnection ?? {}),
    ...options.consumer,
    metadataMaxAge:
      options.consumer?.metadataMaxAge ?? DEFAULT_KAFKA_METADATA_MAX_AGE_MS,
  });
}

/** @internal */
export function createKafkaProducer(
  options: KafkaOptions,
  clientId: string,
): KafkaProducer {
  const resolvedConnection = resolveConnectionOptions(
    options.connection,
    options.brokers,
  );
  return new Producer({
    bootstrapBrokers: options.brokers,
    clientId,
    serializers: {
      headerKey: stringSerializer,
      headerValue: stringSerializer,
      key: serializeJson,
      value: serializeJson,
    },
    autocreateTopics: true,
    timeout: 30000,
    connectTimeout: 10000,
    retries: 5,
    ...(options.idempotentProducer ? { idempotent: true } : {}),
    ...(resolvedConnection ?? {}),
    ...options.producer,
    metadataMaxAge:
      options.producer?.metadataMaxAge ?? DEFAULT_KAFKA_METADATA_MAX_AGE_MS,
  });
}

function formatPartitions(partitions: number[]): string {
  const sorted = [...partitions].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      if (i < sorted.length) {
        start = sorted[i];
        end = sorted[i];
      }
    }
  }
  return ranges.join(", ");
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** @internal */
export function logPartitionAssignments(
  logger: Logger,
  groupId: string,
  data: ConsumerGroupJoinPayload,
): void {
  const assignments = (data.assignments ?? []).filter(
    (a) => a.partitions.length > 0,
  );
  if (!assignments.length) return;
  const total = assignments.reduce((s, a) => s + a.partitions.length, 0);
  const topicW = Math.max(...assignments.map((a) => a.topic.length));
  const rangeW = Math.max(
    ...assignments.map((a) => formatPartitions(a.partitions).length),
  );
  const rows = assignments
    .map((a) => {
      const range = formatPartitions(a.partitions).padEnd(rangeW);
      return `  ${a.topic.padEnd(topicW)}  [${range}]  (${a.partitions.length})`;
    })
    .join("\n");
  logger.log(
    `Consumer group "${groupId}" — ${plural(total, "partition")} across ${plural(assignments.length, "topic")}:\n${rows}`,
  );
}

/** @internal */
export type EmitMessageParts = {
  value: string;
  key?: string;
  headers?: Record<string, string>;
};

function serializeKey(v: unknown): string | undefined {
  if (v === undefined) return undefined;
  if (v === null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function normalizeHeaders(raw: unknown): Record<string, string> | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw))
    return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === undefined) continue;
    out[k] =
      v === null
        ? "null"
        : typeof v === "object"
          ? JSON.stringify(v)
          : String(v);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function isEnvelope(data: unknown): data is Record<string, unknown> {
  return (
    typeof data === "object" &&
    data !== null &&
    !Array.isArray(data) &&
    ("keys" in data || "key" in data || "headers" in data)
  );
}

/** @internal */
export function getOrCreatePartitionQueue(
  queues: Map<number, SerialQueue>,
  partition: number,
): SerialQueue {
  let q = queues.get(partition);
  if (!q) {
    q = new SerialQueue();
    queues.set(partition, q);
  }
  return q;
}

/** @internal */
export function getPartitionQueueMetrics(
  queues: Map<number, SerialQueue>,
): Record<number, number> {
  const result: Record<number, number> = {};
  for (const [partition, queue] of queues) {
    if (queue.pending > 0) result[partition] = queue.pending;
  }
  return result;
}

/** @internal */
export function logPendingPartitionMetrics(
  logger: Logger,
  queues: Map<number, SerialQueue>,
): void {
  const metrics = getPartitionQueueMetrics(queues);
  const total = Object.values(metrics).reduce((s, n) => s + n, 0);
  if (total > 0) {
    logger.log(
      `Waiting for ${total} pending message(s) across ${Object.keys(metrics).length} partition(s)...`,
    );
  }
}

export async function waitForPartitionQueues(
  logger: Logger,
  queues: Map<number, SerialQueue>,
  mainQueue: SerialQueue,
  shutdownTimeoutMs: number | undefined,
): Promise<void> {
  const allIdle = Promise.all([
    ...[...queues.values()].map((q) => q.idle()),
    mainQueue.idle(),
  ]);
  if (!shutdownTimeoutMs) {
    await allIdle;
    return;
  }
  await Promise.race([
    allIdle,
    sleepMs(shutdownTimeoutMs).then(() =>
      logger.warn(
        `Shutdown timeout (${shutdownTimeoutMs}ms) exceeded, forcing close`,
      ),
    ),
  ]);
}

/** @internal */
export function buildDlqHeaders(
  payload: KafkaMessage,
  error: unknown,
  failures: number,
): Map<string, string> {
  const headers = new Map<string, string>([
    ["x-dlq-original-topic", payload.topic],
    ["x-dlq-original-partition", String(payload.partition)],
    ["x-dlq-original-offset", String(payload.offset)],
    ["x-dlq-failures", String(failures)],
    ["x-dlq-error", String(error).slice(0, 500)],
  ]);
  for (const [k, v] of payload.headers) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return headers;
}

/** @internal */
export function buildEmitMessageParts(data: unknown): EmitMessageParts {
  if (!isEnvelope(data)) {
    return { value: data === undefined ? "null" : JSON.stringify(data) };
  }
  const key = serializeKey("keys" in data ? data.keys : data.key);
  const value =
    "value" in data
      ? data.value === undefined
        ? "null"
        : JSON.stringify(data.value)
      : "null";
  const headers = normalizeHeaders(data.headers);
  return {
    value,
    ...(key !== undefined ? { key } : {}),
    ...(headers ? { headers } : {}),
  };
}
