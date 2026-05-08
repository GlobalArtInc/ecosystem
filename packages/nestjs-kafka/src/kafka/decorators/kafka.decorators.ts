import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import { KAFKA_SUBSCRIBE_METADATA } from "../constants/kafka.constants";
import type { KafkaSubscribeOptions } from "../types/kafka.types";
import { KafkaContext } from "../context/kafka.context";

const getCtx = (ctx: ExecutionContext): KafkaContext =>
  ctx.switchToRpc().getContext<KafkaContext>();

export const KafkaKey = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const msg = getCtx(ctx).getMessage();
    return msg.key != null ? msg.key.toString("utf8") : undefined;
  },
);

export const KafkaMessageHeaders = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => getCtx(ctx).getHeaders(),
);

export const KafkaHeader = createParamDecorator(
  (name: string, ctx: ExecutionContext): string | undefined =>
    getCtx(ctx).getHeaders().get(name),
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

export const KafkaSubscribe = (
  topic: string,
  options?: KafkaSubscribeOptions,
): MethodDecorator => SetMetadata(KAFKA_SUBSCRIBE_METADATA, { topic, options });
