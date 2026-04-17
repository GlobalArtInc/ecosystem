import { BaseRpcContext } from "@nestjs/microservices/ctx-host/base-rpc.context";
import type { PlatformaticKafkaMessage } from "../types/platformatic-kafka.types";

type PlatformaticKafkaContextArgs = [
  message: PlatformaticKafkaMessage,
  partition: number,
  topic: string,
  headers: PlatformaticKafkaMessage["headers"],
  commit: () => Promise<void>,
  nack: (delayMs?: number) => void,
];

/**
 * Execution context passed to every `@EventPattern` / `@MessagePattern` handler.
 * Inject it with the `@Ctx()` decorator to access the raw Kafka message metadata.
 *
 * @example
 * ```ts
 * @EventPattern('order.created')
 * handle(@Payload() data: OrderDto, @Ctx() ctx: PlatformaticKafkaContext) {
 *   console.log(ctx.getTopic(), ctx.getPartition());
 * }
 * ```
 */
export class PlatformaticKafkaContext extends BaseRpcContext<PlatformaticKafkaContextArgs> {
  constructor(args: PlatformaticKafkaContextArgs) {
    super(args);
  }

  /** Returns the full raw Kafka message object. */
  getMessage(): PlatformaticKafkaMessage {
    return this.args[0];
  }

  /** Returns the partition number the message was consumed from. */
  getPartition(): number {
    return this.args[1];
  }

  /** Returns the topic name the message was consumed from. */
  getTopic(): string {
    return this.args[2];
  }

  /** Returns the message headers map. */
  getHeaders(): PlatformaticKafkaMessage["headers"] {
    return this.args[3];
  }

  /** Commits the offset for this message (manual ack). */
  commit(): Promise<void> {
    return this.args[4]();
  }

  /** Signals processing failure — message will be retried after `delayMs` (default 5000ms). */
  nack(delayMs?: number): void {
    this.args[5](delayMs);
  }
}
