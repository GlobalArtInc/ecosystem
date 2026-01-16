import { ExecutionContext } from '@nestjs/common';

export class ActivityExecutionContext implements ExecutionContext {
  constructor(
    private readonly instance: object,
    private readonly handler: Function,
    private readonly args: unknown[]
  ) {}

  getClass<T = unknown>(): Type<T> {
    return this.instance.constructor as Type<T>;
  }

  getHandler(): Function {
    return this.handler;
  }

  getArgs<T extends Array<unknown> = unknown[]>(): T {
    return this.args as T;
  }

  getArgByIndex<T = unknown>(index: number): T {
    return this.args[index] as T;
  }

  switchToRpc(): ReturnType<ExecutionContext['switchToRpc']> {
    throw new Error('Context does not support RPC context');
  }

  switchToHttp(): ReturnType<ExecutionContext['switchToHttp']> {
    throw new Error('Context does not support HTTP context');
  }

  switchToWs(): ReturnType<ExecutionContext['switchToWs']> {
    throw new Error('Context does not support WebSocket context');
  }

  getType<TContext extends string = string>(): TContext {
    return 'temporal' as TContext;
  }
}

type Type<T = unknown> = new (...args: unknown[]) => T;

