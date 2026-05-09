import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import { KAFKA_SUBSCRIBE_METADATA } from "../constants/kafka.constants";
import type { KafkaKey, KafkaSubscribeOptions } from "../types/kafka.types";
import { KafkaContext } from "../context/kafka.context";

const getCtx = (ctx: ExecutionContext): KafkaContext =>
  ctx.switchToRpc().getContext<KafkaContext>();

export const KafkaMessageKey = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => getCtx(ctx).getKeys(),
)

export const KafkaMessageHeaders = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => getCtx(ctx).getHeaders(),
);

export const KafkaMessageHeader = createParamDecorator(
  (name: string, ctx: ExecutionContext): string | undefined =>
    getCtx(ctx).getHeaders().get(name),
);

export const KafkaMessageTopic = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => getCtx(ctx).getTopic(),
);

export const KafkaMessagePartition = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): number => getCtx(ctx).getPartition(),
);

export const KafkaMessageAck = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): (() => Promise<void>) => {
    const c = getCtx(ctx);
    return c.commit.bind(c);
  },
);

export const KafkaMessageNack = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ((delayMs?: number) => void) => {
    const c = getCtx(ctx);
    return c.nack.bind(c);
  },
);

export const KafkaSubscribe = (
  topic: string,
  options?: KafkaSubscribeOptions,
): MethodDecorator => SetMetadata(KAFKA_SUBSCRIBE_METADATA, { topic, options });
