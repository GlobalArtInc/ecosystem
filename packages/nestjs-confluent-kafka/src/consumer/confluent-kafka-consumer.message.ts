import type { ConfluentKafkaMessage } from "../types/confluent-kafka.types";

export interface KafkaMessage<T = unknown> {
  readonly payload: T;
  readonly key: string | undefined;
  readonly headers: Map<string, string>;
  readonly topic: string;
  readonly partition: number;
  readonly offset: string;
  ack(): Promise<void>;
  nack(delayMs?: number): void;
}

export class KafkaMessageImpl<T = unknown> implements KafkaMessage<T> {
  private _acked = false;
  private _nackDelay: number | null = null;

  get key(): string | undefined {
    return this._raw.key ?? undefined;
  }
  get headers(): Map<string, string> {
    return this._raw.headers;
  }
  get topic(): string {
    return this._raw.topic;
  }
  get partition(): number {
    return this._raw.partition;
  }
  get offset(): string {
    return this._raw.offset;
  }
  get wasAcked(): boolean {
    return this._acked;
  }
  get nackDelay(): number | null {
    return this._nackDelay;
  }

  constructor(
    private readonly _raw: ConfluentKafkaMessage,
    readonly payload: T,
  ) {}

  async ack(): Promise<void> {
    if (this._acked) return;
    this._acked = true;
    await this._raw.commit();
  }

  nack(delayMs = 5000): void {
    this._nackDelay = delayMs;
  }

  resetState(): void {
    this._acked = false;
    this._nackDelay = null;
  }
}
