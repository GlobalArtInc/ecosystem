import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { KafkaContext } from "../context/kafka.context";

const getCtx = (ctx: ExecutionContext): KafkaContext =>
  ctx.switchToRpc().getContext<KafkaContext>();

/** Injects the deserialized Kafka message key into a handler parameter. */
export const KafkaMessageKey = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => getCtx(ctx).getKey(),
)

/** Injects the Kafka message headers map into a handler parameter. */
export const KafkaMessageHeaders = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => getCtx(ctx).getHeaders(),
);

/** Injects a single Kafka message header value by name into a handler parameter. */
export const KafkaMessageHeader = createParamDecorator(
  (name: string, ctx: ExecutionContext): string | undefined =>
    getCtx(ctx).getHeaders().get(name),
);

/** Injects the Kafka topic name into a handler parameter. */
export const KafkaMessageTopic = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => getCtx(ctx).getTopic(),
);

/** Injects the Kafka partition number into a handler parameter. */
export const KafkaMessagePartition = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): number => getCtx(ctx).getPartition(),
);

/** Injects the commit function for manual offset acknowledgement into a handler parameter. */
export const KafkaMessageAck = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): (() => Promise<void>) => {
    const c = getCtx(ctx);
    return c.commit.bind(c);
  },
);

/** Injects the nack function for triggering a retry into a handler parameter. */
export const KafkaMessageNack = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ((delayMs?: number) => void) => {
    const c = getCtx(ctx);
    return c.nack.bind(c);
  },
);

