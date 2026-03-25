import { Injectable } from "@nestjs/common";
import { traceContextStorage } from "./trace-context.storage";

@Injectable()
export class TraceContextService {
  /**
   * Sets trace-id for the current async context.
   * Affects all subsequent logs within the same request/async scope.
   */
  setTraceId(traceId: string): void {
    const store = traceContextStorage.getStore();
    if (store) {
      store.correlationId = traceId;
    }
  }

  /**
   * Returns the current trace-id from the async context.
   */
  getTraceId(): string | undefined {
    return traceContextStorage.getStore()?.correlationId;
  }

  /**
   * Runs a callback in a new isolated async context with the given trace-id.
   * Does not affect the parent context.
   */
  runWithTraceId<T>(traceId: string, fn: () => T): T {
    return traceContextStorage.run({ correlationId: traceId }, fn);
  }
}
