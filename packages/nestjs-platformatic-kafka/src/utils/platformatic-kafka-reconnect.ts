import type { ReconnectConfig } from "../types/platformatic-kafka.types";

export function formatError(err: unknown, depth = 0): string {
  if (depth > 3) return String(err);
  if (err instanceof AggregateError && err.errors?.length) {
    const causes = err.errors.map((e: unknown) => formatError(e, depth + 1)).join("; ");
    return `${err.message} [${causes}]`;
  }
  if (err instanceof Error && err.cause) {
    return `${err.message} (caused by: ${formatError(err.cause, depth + 1)})`;
  }
  return String(err);
}

export function getReconnectDelays(cfg: ReconnectConfig): {
  initial: number;
  max: number;
  factor: number;
} {
  return {
    initial: cfg?.initialDelayMs ?? 5000,
    max: cfg?.maxDelayMs ?? 5000,
    factor: cfg?.multiplier ?? 1,
  };
}

type WithTimeout = { setTimeout(fn: () => void, ms: number): void };

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) =>
    (globalThis as unknown as WithTimeout).setTimeout(resolve, ms),
  );
}

/**
 * Runs `attempt` in a loop with exponential backoff until it succeeds or `isClosed()` returns true.
 * If `isClosed()` is true when an error is caught, the error is rethrown immediately.
 */
function jitter(ms: number): number {
  return Math.floor(ms * (0.75 + Math.random() * 0.5));
}

export async function runWithBackoff(
  reconnect: ReconnectConfig | undefined,
  isClosed: () => boolean,
  attempt: () => Promise<void>,
  onWait: (delay: number, err: unknown) => void,
  closeSignal?: Promise<void>,
): Promise<void> {
  const { initial, max, factor } = getReconnectDelays(reconnect ?? {});
  let delay = initial;
  while (!isClosed()) {
    try {
      await attempt();
      return;
    } catch (err) {
      if (isClosed()) return;
      const jittered = jitter(delay);
      onWait(jittered, err);
      await (closeSignal ? Promise.race([sleepMs(jittered), closeSignal]) : sleepMs(jittered));
      delay = Math.min(Math.floor(delay * factor), max);
    }
  }
}
