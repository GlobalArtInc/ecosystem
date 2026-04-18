import { BaseRpcContext } from "@nestjs/microservices/ctx-host/base-rpc.context";
import type { ConfluentKafkaMessage, ParsedConfluentKafkaMessage } from "../types/confluent-kafka.types";

type ConfluentKafkaContextArgs = [
  message: ParsedConfluentKafkaMessage,
  partition: number,
  topic: string,
  headers: Map<string, string>,
  commit: () => Promise<void>,
  nack: (delayMs?: number) => void,
];

type RawContextArgs = [
  message: ConfluentKafkaMessage,
  partition: number,
  topic: string,
  headers: Map<string, string>,
  commit: () => Promise<void>,
  nack: (delayMs?: number) => void,
];

function tryParseAsObject(s: string): object | string {
  try {
    const parsed = JSON.parse(s);
    return typeof parsed === "object" && parsed !== null ? parsed : s;
  } catch {
    return s;
  }
}

function parseMessage(raw: ConfluentKafkaMessage): ParsedConfluentKafkaMessage {
  const headers = new Map<string, object | string>();
  for (const [k, v] of raw.headers) {
    headers.set(k, tryParseAsObject(v));
  }
  return {
    ...raw,
    value: tryParseAsObject(raw.value),
    key: raw.key != null ? tryParseAsObject(raw.key) : raw.key,
    headers,
  };
}

export class ConfluentKafkaContext extends BaseRpcContext<ConfluentKafkaContextArgs> {
  constructor([message, ...rest]: RawContextArgs) {
    super([parseMessage(message), ...rest] as ConfluentKafkaContextArgs);
  }

  getMessage(): ParsedConfluentKafkaMessage { return this.args[0]; }
  getPartition(): number { return this.args[1]; }
  getTopic(): string { return this.args[2]; }
  getHeaders(): Map<string, string> { return this.args[3]; }
  commit(): Promise<void> { return this.args[4](); }
  nack(delayMs?: number): void { this.args[5](delayMs); }
}
