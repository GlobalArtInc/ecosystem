import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const ActivityPayload = () => createParamDecorator((_, ctx: ExecutionContext) => {
  return ctx.getArgByIndex(0);
});