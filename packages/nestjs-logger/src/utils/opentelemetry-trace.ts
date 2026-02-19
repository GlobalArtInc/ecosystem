export interface TraceIds {
  traceId?: string;
  spanId?: string;
}

let cachedGetter: (() => TraceIds) | null | undefined = undefined;

function createGetter(): () => TraceIds {
  try {
    const api = require("@opentelemetry/api");
    return () => {
      const span = api.trace?.getSpan?.(api.context?.active?.());
      if (!span) return {};
      const { spanId, traceId } = span.spanContext?.() ?? {};
      return spanId && traceId ? { spanId, traceId } : {};
    };
  } catch {
    return () => ({});
  }
}

export function getOpenTelemetryTraceIds(): TraceIds {
  if (cachedGetter === undefined) {
    cachedGetter = createGetter();
  }
  return cachedGetter?.() ?? {};
}
