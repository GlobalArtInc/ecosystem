import type { ReconnectConfig } from "../types/platformatic-kafka.types";

/**
 * Resolves reconnect timing parameters from the user-supplied config,
 * filling in defaults (1 s initial delay, 60 s cap, ×2 backoff factor).
 */
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

/** Resolves after `ms` milliseconds. Used to pause between reconnect attempts. */
export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
