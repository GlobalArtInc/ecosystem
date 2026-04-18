import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import { KAFKA_SUBSCRIBE_METADATA } from "../constants/platformatic-kafka.constants";
import type { KafkaSubscribeOptions } from "../types/platformatic-kafka.types";
import { PlatformaticKafkaContext } from "../context/platformatic-kafka.context";

const getCtx = (ctx: ExecutionContext): PlatformaticKafkaContext =>
  ctx.switchToRpc().getContext<PlatformaticKafkaContext>();

/** Injects the raw Kafka message key (string or parsed JSON object). */
export const KafkaKey = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => getCtx(ctx).getMessage().key ?? undefined,
);

/** Injects the full headers map (`Map<string, string>`). */
export const KafkaHeaders = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => getCtx(ctx).getHeaders(),
);

/** Injects a single header value by name. */
export const KafkaHeader = createParamDecorator(
  (name: string, ctx: ExecutionContext): string | undefined => getCtx(ctx).getHeaders().get(name),
);

/** Injects the topic name. */
export const KafkaTopic = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => getCtx(ctx).getTopic(),
);

/** Injects the partition number. */
export const KafkaPartition = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): number => getCtx(ctx).getPartition(),
);

/** Injects the manual ack function — call to commit the offset. */
export const KafkaAck = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): (() => Promise<void>) => {
    const c = getCtx(ctx);
    return c.commit.bind(c);
  },
);

/** Injects the nack function — call to signal failure and trigger retry after `delayMs`. */
export const KafkaNack = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ((delayMs?: number) => void) => {
    const c = getCtx(ctx);
    return c.nack.bind(c);
  },
);

/** Marks a method as a Kafka topic consumer. The method receives a single `KafkaMessage<T>` argument. */
export const KafkaSubscribe = (topic: string, options?: KafkaSubscribeOptions): MethodDecorator =>
  SetMetadata(KAFKA_SUBSCRIBE_METADATA, { topic, options });
