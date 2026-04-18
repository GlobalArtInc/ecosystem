import type { ReconnectConfig } from "../types/platformatic-kafka.types";

export function getReconnectDelays(cfg: ReconnectConfig): {
  initial: number;
  max: number;
  factor: number;
} {
  return {
    initial: cfg?.initialDelayMs ?? 1000,
    max: cfg?.maxDelayMs ?? 60_000,
    factor: cfg?.multiplier ?? 2,
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
export async function runWithBackoff(
  reconnect: ReconnectConfig | undefined,
  isClosed: () => boolean,
  attempt: () => Promise<void>,
  onWait: (delay: number) => void,
): Promise<void> {
  const { initial, max, factor } = getReconnectDelays(reconnect ?? {});
  let delay = initial;
  while (!isClosed()) {
    try {
      await attempt();
      return;
    } catch (err) {
      if (isClosed()) throw err;
      onWait(delay);
      await sleepMs(delay);
      delay = Math.min(Math.floor(delay * factor), max);
    }
  }
}
