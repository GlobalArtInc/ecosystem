import {
  Consumer,
  type ConsumerGroupJoinPayload,
  Producer,
  stringDeserializers,
  stringSerializers,
} from "@platformatic/kafka";
import type { Logger } from "@nestjs/common";
import { Subject } from "rxjs";
import type {
  KafkaConsumer,
  KafkaProducer,
  PlatformaticClientEvent,
  PlatformaticKafkaOptions,
  PlatformaticKafkaStatus,
} from "../types/platformatic-kafka.types";
import { PlatformaticKafkaStatus as Status } from "../types/platformatic-kafka.types";

type KafkaClientLike = {
  on(event: PlatformaticClientEvent, handler: () => void): unknown;
};

export function resolveKafkaGroupId(
  configured: string | undefined | null,
  defaultGroup: string,
  postfix: string,
): string {
  return `${configured?.length ? configured : defaultGroup}${postfix}`;
}

export function resolvePostfixId(
  configured: string | undefined | null,
  fallback: string,
): string {
  return configured?.length ? configured : fallback;
}

/** Serializes async operations into a strict FIFO queue so that operations never interleave. */
export class SerialQueue {
  private tail: Promise<void> = Promise.resolve();

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.tail.then(() => fn());
    this.tail = next.then(() => undefined, () => undefined);
    return next;
  }

  idle(): Promise<void> {
    return this.tail;
  }
}

export function registerClientEventListeners(
  client: KafkaClientLike,
  status$: Subject<PlatformaticKafkaStatus>,
  onFailed: () => void,
): void {
  client.on("client:broker:connect", () => status$.next(Status.CONNECTED));
  client.on("client:broker:disconnect", () => status$.next(Status.DISCONNECTED));
  client.on("client:broker:failed", () => {
    status$.next(Status.FAILED);
    onFailed();
  });
}

export async function closeKafkaClients(
  consumer: KafkaConsumer | null | undefined,
  producer: KafkaProducer | null | undefined,
  forceCloseConsumer = false,
): Promise<void> {
  const tryClose = (client: KafkaConsumer | KafkaProducer, force?: boolean): Promise<void> =>
    Promise.resolve(client.close(force)).catch(() => undefined);

  const closeConsumer = async (): Promise<void> => {
    if (!consumer) return;
    await Promise.resolve(); // yield before closing to let pending callbacks flush
    if (forceCloseConsumer) {
      await tryClose(consumer, true);
      return;
    }
    try {
      await Promise.resolve(consumer.close(false));
    } catch {
      await tryClose(consumer, true);
    }
  };

  await Promise.all([
    closeConsumer(),
    producer ? tryClose(producer) : Promise.resolve(),
  ]);
}

export function ensureBootstrapMetadata(
  client: KafkaConsumer | KafkaProducer,
): Promise<void> {
  return client.metadata({ topics: [] }).then(() => undefined);
}

export function createKafkaConsumer(
  options: PlatformaticKafkaOptions,
  clientId: string,
  groupId: string,
): KafkaConsumer {
  return new Consumer({
    groupId,
    clientId,
    bootstrapBrokers: options.brokers,
    maxWaitTime: 1000,
    autocommit: 100,
    deserializers: stringDeserializers,
    autocreateTopics: true,
    ...(options.connection ?? {}),
    ...options.consumer,
  });
}

export function createKafkaProducer(
  options: PlatformaticKafkaOptions,
  clientId: string,
): KafkaProducer {
  return new Producer({
    bootstrapBrokers: options.brokers,
    clientId,
    serializers: stringSerializers,
    autocreateTopics: true,
    ...(options.connection ?? {}),
    ...options.producer,
  });
}

export function logPartitionAssignments(
  logger: Logger,
  groupId: string,
  data: ConsumerGroupJoinPayload,
): void {
  const assignments = (data.assignments ?? []).filter((a) => a.partitions.length > 0);
  if (!assignments.length) return;
  const total = assignments.reduce((s, a) => s + a.partitions.length, 0);
  const w = Math.max(...assignments.map((a) => a.topic.length));
  const rows = assignments
    .map((a) => `  ${a.topic.padEnd(w)}  →  [${a.partitions.join(", ")}]  (${a.partitions.length})`)
    .join("\n");
  logger.log(
    `Consumer group "${groupId}" — assigned ${total} partition(s) across ${assignments.length} topic(s):\n${rows}`,
  );
}

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
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === undefined) continue;
    out[k] = v === null ? "null" : typeof v === "object" ? JSON.stringify(v) : String(v);
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

export function buildEmitMessageParts(data: unknown): EmitMessageParts {
  if (!isEnvelope(data)) {
    return { value: data === undefined ? "null" : JSON.stringify(data) };
  }
  const key = serializeKey("keys" in data ? data.keys : data.key);
  const value = "value" in data
    ? (data.value === undefined ? "null" : JSON.stringify(data.value))
    : "null";
  const headers = normalizeHeaders(data.headers);
  return {
    value,
    ...(key !== undefined ? { key } : {}),
    ...(headers ? { headers } : {}),
  };
}
