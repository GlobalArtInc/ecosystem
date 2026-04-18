import { Kafka } from "@confluentinc/kafka-javascript";
import type { Logger } from "@nestjs/common";
import type {
  ConfluentKafkaConsumer,
  ConfluentKafkaMessage,
  ConfluentKafkaOptions,
  ConfluentKafkaProducer,
  ConfluentKafkaStatus,
} from "../types/confluent-kafka.types";
import { ConfluentKafkaStatus as Status } from "../types/confluent-kafka.types";
import type { Subject } from "rxjs";
import {
  DEFAULT_KAFKA_CLIENT_ID,
  DEFAULT_KAFKA_GROUP,
  DEFAULT_POSTFIX_SERVER,
} from "../constants/confluent-kafka.constants";

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

export function headersToMap(
  headers: Record<string, Buffer | string | null | undefined> | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  if (!headers) return map;
  for (const [key, value] of Object.entries(headers)) {
    if (value == null) continue;
    map.set(key, typeof value === "string" ? value : value.toString());
  }
  return map;
}

export function mapToHeaders(
  map: Map<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [key, value] of map) {
    headers[key] = value;
  }
  return headers;
}

export function commitOffset(
  consumer: ConfluentKafkaConsumer,
  topic: string,
  partition: number,
  offset: string,
): Promise<void> {
  return consumer.commitOffsets([{
    topic,
    partition,
    offset: (parseInt(offset, 10) + 1).toString(),
  }]);
}

export function createKafkaInstance(options: ConfluentKafkaOptions, clientId: string): Kafka {
  return new Kafka({
    kafkaJS: {
      brokers: options.brokers,
      clientId,
      ...(options.ssl !== undefined ? { ssl: options.ssl as boolean } : {}),
      ...(options.sasl ? { sasl: options.sasl } : {}),
      ...(options.connectionTimeout ? { connectionTimeout: options.connectionTimeout } : {}),
      ...(options.requestTimeout ? { requestTimeout: options.requestTimeout } : {}),
    },
  });
}

export function createKafkaProducer(
  kafka: Kafka,
  options: ConfluentKafkaOptions,
): ConfluentKafkaProducer {
  return kafka.producer({
    kafkaJS: {
      allowAutoTopicCreation: true,
      ...(options.producer?.idempotent ? { idempotent: true } : {}),
      ...options.producer,
    },
  });
}

export function createKafkaConsumer(
  kafka: Kafka,
  options: ConfluentKafkaOptions,
  groupId: string,
): ConfluentKafkaConsumer {
  return kafka.consumer({
    kafkaJS: {
      groupId,
      allowAutoTopicCreation: true,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      ...options.consumer,
    },
  });
}

export async function disconnectKafkaClients(
  consumer: ConfluentKafkaConsumer | null | undefined,
  producer: ConfluentKafkaProducer | null | undefined,
): Promise<void> {
  await Promise.all([
    consumer ? consumer.disconnect().catch(() => undefined) : Promise.resolve(),
    producer ? producer.disconnect().catch(() => undefined) : Promise.resolve(),
  ]);
}

export function emitConnected(status$: Subject<ConfluentKafkaStatus>): void {
  status$.next(Status.CONNECTED);
}

export function emitDisconnected(status$: Subject<ConfluentKafkaStatus>): void {
  status$.next(Status.DISCONNECTED);
}

export function emitFailed(status$: Subject<ConfluentKafkaStatus>): void {
  status$.next(Status.FAILED);
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

export function buildDlqHeaders(
  payload: ConfluentKafkaMessage,
  error: unknown,
  failures: number,
): Record<string, string> {
  const headers: Record<string, string> = {
    "x-dlq-original-topic": payload.topic,
    "x-dlq-original-partition": String(payload.partition),
    "x-dlq-original-offset": String(payload.offset),
    "x-dlq-failures": String(failures),
    "x-dlq-error": String(error).slice(0, 500),
  };
  for (const [k, v] of payload.headers) {
    if (!(k in headers)) headers[k] = v;
  }
  return headers;
}

export function resolveDefaultClientAndGroup(
  options: ConfluentKafkaOptions,
  postfixFallback: string,
): { clientId: string; groupId: string } {
  const postfix = resolvePostfixId(options.postfixId, postfixFallback);
  const clientId = (options.clientId ?? DEFAULT_KAFKA_CLIENT_ID) + postfix;
  const groupId = resolveKafkaGroupId(options.groupId, DEFAULT_KAFKA_GROUP, postfix);
  return { clientId, groupId };
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
      () => { this._pending--; },
      () => { this._pending--; },
    );
    return next;
  }

  idle(): Promise<void> {
    return this.tail;
  }
}

export function logPartitionAssignments(
  logger: Logger,
  groupId: string,
  memberAssignment: Record<string, number[]>,
): void {
  const assignments = Object.entries(memberAssignment).filter(([, parts]) => parts.length > 0);
  if (!assignments.length) return;
  const total = assignments.reduce((s, [, p]) => s + p.length, 0);
  const topicW = Math.max(...assignments.map(([t]) => t.length));
  const rows = assignments
    .map(([topic, parts]) => {
      const sorted = [...parts].sort((a, b) => a - b);
      return `  ${topic.padEnd(topicW)}  [${sorted.join(", ")}]  (${parts.length})`;
    })
    .join("\n");
  logger.log(
    `Consumer group "${groupId}" — ${total} partition(s) across ${assignments.length} topic(s):\n${rows}`,
  );
}

