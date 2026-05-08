import { BaseRpcContext } from "@nestjs/microservices/ctx-host/base-rpc.context";
import type { KafkaJS } from "@confluentinc/kafka-javascript";

type KafkaContextArgs = [
  message: KafkaJS.KafkaMessage,
  partition: number,
  topic: string,
  headers: Map<string, string>,
  commit: () => Promise<void>,
  nack: (delayMs?: number) => void,
];

export function headersToMap(headers?: KafkaJS.IHeaders): Map<string, string> {
  const map = new Map<string, string>();
  if (!headers) return map;
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    const v = Array.isArray(value) ? value[0] : value;
    if (v !== undefined) {
      map.set(key, Buffer.isBuffer(v) ? v.toString("utf8") : v);
    }
  }
  return map;
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
    super([message, partition, topic, headersToMap(headers), commit, nack]);
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

  getHeaders(): Map<string, string> {
    return this.args[3];
  }

  commit(): Promise<void> {
    return this.args[4]();
  }

  nack(delayMs?: number): void {
    this.args[5](delayMs);
  }
}
