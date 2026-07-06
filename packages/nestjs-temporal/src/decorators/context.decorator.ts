import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * The Temporal `Info` object is appended as the last argument passed to the
 * activity handler (see TemporalExplorer.handleActivities), after all of the
 * activity's own parameters.
 */
export const ActivityContext = () =>
  createParamDecorator((_, ctx: ExecutionContext) => {
    const args = ctx.getArgs();
    return args[args.length - 1];
  });

export const ActivityPayload = () =>
  createParamDecorator((_, ctx: ExecutionContext) => {
    return ctx.getArgByIndex(0);
  });
