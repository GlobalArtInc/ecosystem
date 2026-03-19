import { AsyncLocalStorage } from "async_hooks";

export interface TraceContext {
  correlationId: string;
}

export const traceContextStorage = new AsyncLocalStorage<TraceContext>();
