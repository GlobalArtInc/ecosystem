import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { KAFKA_SUBSCRIBE_METADATA } from "../constants/platformatic-kafka.constants";
import type { KafkaSubscribeOptions } from "../types/platformatic-kafka.types";
import { PlatformaticKafkaContext } from "../context/platformatic-kafka.context";

const getContext = (ctx: ExecutionContext): PlatformaticKafkaContext =>
  ctx.switchToRpc().getContext<PlatformaticKafkaContext>();

/** Injects the raw Kafka message key. */
export const KafkaKey = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined =>
    getContext(ctx).getMessage().key ?? undefined,
);

/** Injects the full headers map (`Map<string, string>`). */
export const KafkaHeaders = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => getContext(ctx).getHeaders(),
);

/**
 * Injects a single header value by name.
 *
 * @example
 * ```ts
 * @EventPattern('orders.created')
 * handle(@Payload() data: unknown, @KafkaHeader('x-trace-id') traceId: string) {}
 * ```
 */
export const KafkaHeader = createParamDecorator(
  (name: string, ctx: ExecutionContext): string | undefined =>
    getContext(ctx).getHeaders().get(name),
);

/** Injects the topic name. */
export const KafkaTopic = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => getContext(ctx).getTopic(),
);

/** Injects the partition number. */
export const KafkaPartition = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): number => getContext(ctx).getPartition(),
);

/**
 * Injects the manual ack function. Call it after successful processing
 * to commit the offset. If not called, the message will be redelivered.
 *
 * @example
 * ```ts
 * @EventPattern('orders.created')
 * async handle(@Payload() data: OrderDto, @KafkaAck() ack: () => Promise<void>) {
 *   await processOrder(data);
 *   await ack();
 * }
 * ```
 */
export const KafkaAck = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): (() => Promise<void>) =>
    getContext(ctx).commit.bind(getContext(ctx)),
);

/**
 * Injects the nack function. Call it to signal failure and trigger a retry after `delayMs`.
 *
 * @example
 * ```ts
 * @EventPattern('orders.created')
 * async handle(@Payload() data: OrderDto, @KafkaNack() nack: (delay?: number) => void) {
 *   try {
 *     await processOrder(data);
 *   } catch (err) {
 *     nack(2000); // retry after 2s
 *   }
 * }
 * ```
 */
export const KafkaNack = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ((delayMs?: number) => void) =>
    getContext(ctx).nack.bind(getContext(ctx)),
);

/**
 * Marks a method as a Kafka topic consumer.
 * The method receives a single `KafkaMessage<T>` argument.
 *
 * @example
 * ```ts
 * @KafkaSubscribe('orders.created')
 * async handle(msg: KafkaMessage<OrderDto>) {
 *   console.log(msg.payload);
 * }
 * ```
 */
export const KafkaSubscribe = (topic: string, options?: KafkaSubscribeOptions): MethodDecorator =>
  (target, propertyKey, descriptor) => {
    SetMetadata(KAFKA_SUBSCRIBE_METADATA, { topic, options })(target, propertyKey, descriptor);
    return descriptor;
  };
