import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import { KAFKA_SUBSCRIBE_METADATA } from "../constants/confluent-kafka.constants";
import type { KafkaSubscribeOptions } from "../types/confluent-kafka.types";
import { ConfluentKafkaContext } from "../context/confluent-kafka.context";

const getCtx = (ctx: ExecutionContext): ConfluentKafkaContext =>
  ctx.switchToRpc().getContext<ConfluentKafkaContext>();

export const KafkaKey = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => getCtx(ctx).getMessage().key ?? undefined,
);

export const KafkaHeaders = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => getCtx(ctx).getHeaders(),
);

export const KafkaHeader = createParamDecorator(
  (name: string, ctx: ExecutionContext): string | undefined => getCtx(ctx).getHeaders().get(name),
);

export const KafkaTopic = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => getCtx(ctx).getTopic(),
);

export const KafkaPartition = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): number => getCtx(ctx).getPartition(),
);

export const KafkaAck = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): (() => Promise<void>) => {
    const c = getCtx(ctx);
    return c.commit.bind(c);
  },
);

export const KafkaNack = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ((delayMs?: number) => void) => {
    const c = getCtx(ctx);
    return c.nack.bind(c);
  },
);

export const KafkaSubscribe = (topic: string, options?: KafkaSubscribeOptions): MethodDecorator =>
  SetMetadata(KAFKA_SUBSCRIBE_METADATA, { topic, options });
