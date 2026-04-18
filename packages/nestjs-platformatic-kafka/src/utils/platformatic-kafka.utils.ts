import {
  Consumer,
  Producer,
  stringDeserializers,
  stringSerializers,
} from "@platformatic/kafka";
import { Subject } from "rxjs";
import {
  KafkaConsumer,
  KafkaProducer,
  PlatformaticClientEvent,
  PlatformaticKafkaOptions,
  PlatformaticKafkaStatus,
} from "../types/platformatic-kafka.types";

type KafkaClientLike = {
  on(event: PlatformaticClientEvent, handler: () => void): unknown;
};

/** Maps internal status enum values to the corresponding @platformatic/kafka event names. */
export const EVENTS_MAP: Record<PlatformaticKafkaStatus, PlatformaticClientEvent> = {
  [PlatformaticKafkaStatus.CONNECTED]: "client:broker:connect",
  [PlatformaticKafkaStatus.DISCONNECTED]: "client:broker:disconnect",
  [PlatformaticKafkaStatus.FAILED]: "client:broker:failed",
};

export function resolveKafkaGroupId(
  configured: string | undefined | null,
  defaultGroup: string,
  postfix: string,
): string {
  const base =
    typeof configured === "string" && configured.length > 0
      ? configured
      : defaultGroup;
  return `${base}${postfix}`;
}

export function resolvePostfixId(
  configured: string | undefined | null,
  fallback: string,
): string {
  if (typeof configured === "string" && configured.length > 0) {
    return configured;
  }
  return fallback;
}

/**
 * Serializes async operations into a strict FIFO queue so that connect,
 * disconnect, and send calls never interleave with each other.
 */
export class SerialQueue {
  private tail: Promise<void> = Promise.resolve();

  /** Appends `fn` to the queue and returns its result promise. */
  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.tail.then(() => fn());
    this.tail = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  idle(): Promise<void> {
    return this.tail;
  }
}

/**
 * Wires the three standard broker lifecycle events (connected / disconnected / failed)
 * onto either a Consumer or Producer instance, forwarding each to the shared status
 * subject and calling `onFailed` when the connection is lost so the caller can
 * schedule a reconnect.
 */
export function registerClientEventListeners(
  client: KafkaClientLike,
  status$: Subject<PlatformaticKafkaStatus>,
  onFailed: () => void,
): void {
  client.on(EVENTS_MAP[PlatformaticKafkaStatus.CONNECTED], () => {
    status$.next(PlatformaticKafkaStatus.CONNECTED);
  });
  client.on(EVENTS_MAP[PlatformaticKafkaStatus.DISCONNECTED], () => {
    status$.next(PlatformaticKafkaStatus.DISCONNECTED);
  });
  client.on(EVENTS_MAP[PlatformaticKafkaStatus.FAILED], () => {
    status$.next(PlatformaticKafkaStatus.FAILED);
    onFailed();
  });
}

/**
 * Closes consumer and producer concurrently, swallowing any errors so that
 * a failed close never blocks the reconnect path.
 *
 * @param forceCloseConsumer - Passed to `Consumer.close()`. When `true` the
 *   consumer leaves the group immediately without a graceful rebalance.
 */
export async function closeKafkaClients(
  consumer: KafkaConsumer | null | undefined,
  producer: KafkaProducer | null | undefined,
  forceCloseConsumer = false,
): Promise<void> {
  const closeConsumer = async (): Promise<void> => {
    if (!consumer) return;
    await new Promise<void>((resolve) => {
      (globalThis as unknown as { setTimeout: (fn: () => void, ms: number) => void }).setTimeout(
        resolve,
        0,
      );
    });
    const closeOnce = (force: boolean) => Promise.resolve(consumer.close(force));
    if (forceCloseConsumer) {
      await closeOnce(true).catch(() => undefined);
      return;
    }
    try {
      await closeOnce(false);
    } catch {
      await closeOnce(true).catch(() => undefined);
    }
  };

  await Promise.all([
    closeConsumer(),
    producer
      ? Promise.resolve(producer.close()).catch(() => undefined)
      : Promise.resolve(),
  ]);
}

export async function ensureBootstrapMetadata(
  client: KafkaConsumer | KafkaProducer,
): Promise<void> {
  await client.metadata({ topics: [] });
}

/**
 * Creates a Consumer pre-configured with string deserializers and sane defaults
 * (1 s max-wait, 100 ms autocommit interval). Any field in `options.consumer`
 * overrides these defaults.
 */
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
    ...options.consumer,
  });
}

/**
 * Creates a Producer pre-configured with string serializers and auto-topic
 * creation. Any field in `options.producer` overrides these defaults.
 */
export function createKafkaProducer(
  options: PlatformaticKafkaOptions,
  clientId: string,
): KafkaProducer {
  return new Producer({
    bootstrapBrokers: options.brokers,
    clientId,
    serializers: stringSerializers,
    autocreateTopics: true,
    ...options.producer,
  });
}

export type EmitMessageParts = {
  value: string;
  key?: string;
  headers?: Record<string, string>;
};

function hasOwnKey(o: object, k: string): boolean {
  return Object.prototype.hasOwnProperty.call(o, k);
}

function isEmitEnvelope(data: unknown): data is Record<string, unknown> {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return false;
  }
  return (
    hasOwnKey(data, "keys") ||
    hasOwnKey(data, "key") ||
    hasOwnKey(data, "headers")
  );
}

function serializeEmitJsonValue(data: unknown): string {
  if (data === undefined) {
    return "null";
  }
  return JSON.stringify(data);
}

function serializeEmitKeyPart(part: unknown): string | undefined {
  if (part === undefined) {
    return undefined;
  }
  if (part === null) {
    return "";
  }
  if (typeof part === "string") {
    return part;
  }
  if (typeof part === "number" || typeof part === "boolean") {
    return String(part);
  }
  if (typeof part === "bigint") {
    return String(part);
  }
  return JSON.stringify(part);
}

function normalizeEmitHeaders(raw: unknown): Record<string, string> | undefined {
  if (raw === null || raw === undefined) {
    return undefined;
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === undefined) {
      continue;
    }
    if (v === null) {
      out[k] = "null";
    } else if (typeof v === "string") {
      out[k] = v;
    } else if (typeof v === "number" || typeof v === "boolean") {
      out[k] = String(v);
    } else if (typeof v === "bigint") {
      out[k] = String(v);
    } else {
      out[k] = JSON.stringify(v);
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function buildEmitMessageParts(data: unknown): EmitMessageParts {
  if (isEmitEnvelope(data)) {
    const o = data;
    let keyPart: string | undefined;
    if (hasOwnKey(o, "keys")) {
      keyPart = serializeEmitKeyPart(o.keys);
    } else if (hasOwnKey(o, "key")) {
      keyPart = serializeEmitKeyPart(o.key);
    }
    const valuePart = hasOwnKey(o, "value")
      ? serializeEmitJsonValue(o.value)
      : "null";
    const headersPart = normalizeEmitHeaders(o.headers);
    const parts: EmitMessageParts = { value: valuePart };
    if (keyPart !== undefined && keyPart.length > 0) {
      parts.key = keyPart;
    }
    if (headersPart !== undefined) {
      parts.headers = headersPart;
    }
    return parts;
  }
  return { value: serializeEmitJsonValue(data) };
}
