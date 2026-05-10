import { BaseRpcContext } from "@nestjs/microservices/ctx-host/base-rpc.context";
import type { KafkaJS } from "@confluentinc/kafka-javascript";
import { KafkaAck, KafkaHeaders, KafkaKey, KafkaNack } from "../types/kafka.types";

type KafkaContextArgs = [
  message: KafkaJS.KafkaMessage,
  partition: number,
  topic: string,
  key: KafkaKey,
  headers: KafkaHeaders,
  commit: KafkaAck,
  nack: KafkaNack,
];

function parseKey(key: KafkaJS.KafkaMessage["key"]): KafkaKey | null {
  if (key == null) return null;
  const raw = key.toString("utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function normalizeHeaders(headers?: KafkaJS.IHeaders): KafkaJS.IHeaders {
  const result: KafkaJS.IHeaders = {};
  if (!headers) return result;
  for (const [k, v] of Object.entries(headers)) {
    const raw = Array.isArray(v) ? v[0] : v;
    if (raw) result[k] = Buffer.isBuffer(raw) ? raw.toString("utf8") : raw;
  }
  return result;
}

export function headersToMap(headers?: KafkaJS.IHeaders): Map<string, string> {
  return new Map(Object.entries(normalizeHeaders(headers)) as [string, string][]);
}

export class KafkaContext extends BaseRpcContext<KafkaContextArgs> {
  constructor(
    message: KafkaJS.KafkaMessage,
    partition: number,
    topic: string,
    headers: KafkaJS.IHeaders | undefined,
    commit: () => Promise<void>,
    nack: (delayMs?: number) => void,
  ) {
    const normalizedHeaders = normalizeHeaders(headers);
    const key = parseKey(message.key);
    const normalizedMessage = {
      ...message,
      key,
      headers: normalizedHeaders,
    } as KafkaJS.KafkaMessage;
    super([normalizedMessage, partition, topic, key, new Map(Object.entries(normalizedHeaders) as [string, string][]), commit, nack]);
  }

  getMessage(): KafkaJS.KafkaMessage {
    return this.args[0];
  }

  getPartition(): number {
    return this.args[1];
  }

  getTopic(): string {
    return this.args[2];
  }

  getKey(): KafkaKey {
    return this.args[3];
  }

  getHeaders(): KafkaHeaders {
    return this.args[4];
  }

  commit(): Promise<void> {
    return this.args[5]();
  }

  nack(delayMs?: number): void {
    this.args[6](delayMs);
  }
}
