import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const ActivityContext = () =>
  createParamDecorator((_, ctx: ExecutionContext) => {
    return ctx.getArgByIndex(1);
  });

export const ActivityPayload = () =>
  createParamDecorator((_, ctx: ExecutionContext) => {
    return ctx.getArgByIndex(0);
  });
