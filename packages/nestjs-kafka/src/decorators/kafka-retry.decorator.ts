import { PATTERN_EXTRAS_METADATA } from "@nestjs/microservices/constants";
import type { KafkaRetryStrategy } from "../types/kafka.types";

/** Extras key under which {@link KafkaRetry} stores its options on the pattern handler. */
export const KAFKA_RETRY_EXTRAS_KEY = "kafkaRetry";

/** Per-handler override for retry/DLQ behaviour, otherwise inherited from `KafkaOptions`. */
export interface KafkaRetryOptions {
  /** Retry strategy for this handler. Overrides the module-level `retryStrategy`. */
  strategy?: KafkaRetryStrategy;
  /** Maximum number of retries before sending to DLQ. Overrides `strategy.maxRetries` and the module-level default. */
  maxRetries?: number;
  /** DLQ topic for this handler. Overrides the module-level `deadLetterTopic`. Pass `false` to drop the message instead of publishing to any DLQ. */
  deadLetterTopic?: string | false;
}

/**
 * Overrides retry/DLQ behaviour for a single `@EventPattern` handler, e.g. to drop
 * messages after fewer failures than the module-wide default.
 *
 * Must be applied together with `@EventPattern` on the same method (order does not matter).
 *
 * @example
 * ```ts
 * @EventPattern("orders.created")
 * @KafkaRetry({ maxRetries: 3, deadLetterTopic: "orders.dlq" })
 * async handleOrder(@Payload() data: Order) { ... }
 * ```
 */
export const KafkaRetry =
  (options: KafkaRetryOptions): MethodDecorator =>
  (_target: object, _key: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(
      PATTERN_EXTRAS_METADATA,
      {
        ...Reflect.getMetadata(PATTERN_EXTRAS_METADATA, descriptor.value),
        [KAFKA_RETRY_EXTRAS_KEY]: options,
      },
      descriptor.value,
    );
    return descriptor;
  };
