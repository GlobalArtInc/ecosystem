import { BaseRpcContext } from "@nestjs/microservices/ctx-host/base-rpc.context";
import type { ParsedKafkaMessage, PlatformaticKafkaMessage } from "../types/platformatic-kafka.types";

type PlatformaticKafkaContextArgs = [
  message: ParsedKafkaMessage,
  partition: number,
  topic: string,
  headers: PlatformaticKafkaMessage["headers"],
  commit: () => Promise<void>,
  nack: (delayMs?: number) => void,
];

type RawContextArgs = [
  message: PlatformaticKafkaMessage,
  partition: number,
  topic: string,
  headers: PlatformaticKafkaMessage["headers"],
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

function parseMessage(raw: PlatformaticKafkaMessage): ParsedKafkaMessage {
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

/** Execution context for `@EventPattern` / `@MessagePattern` handlers. Inject with `@Ctx()`. */
export class PlatformaticKafkaContext extends BaseRpcContext<PlatformaticKafkaContextArgs> {
  constructor([message, ...rest]: RawContextArgs) {
    super([parseMessage(message), ...rest] as PlatformaticKafkaContextArgs);
  }

  getMessage(): ParsedKafkaMessage { return this.args[0]; }
  getPartition(): number { return this.args[1]; }
  getTopic(): string { return this.args[2]; }
  getHeaders(): PlatformaticKafkaMessage["headers"] { return this.args[3]; }
  commit(): Promise<void> { return this.args[4](); }
  nack(delayMs?: number): void { this.args[5](delayMs); }
}
