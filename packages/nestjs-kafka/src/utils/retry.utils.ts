import { DEFAULT_RETRY_DELAY_MS } from "../constants/kafka.constants";
import type { KafkaRetryStrategy } from "../types/kafka.types";

/** Computes the delay in ms for the given attempt number (1-based) based on the configured strategy. */
export const computeRetryDelay = (
  strategy: KafkaRetryStrategy,
  attempt: number,
): number => {
  if (strategy.type === "fixed") {
    return strategy.delayMs ?? DEFAULT_RETRY_DELAY_MS;
  }

  const initial = strategy.initialDelayMs ?? 1_000;
  const multiplier = strategy.multiplier ?? 2;
  const maxDelay = strategy.maxDelayMs ?? 30_000;

  let delay = Math.min(initial * Math.pow(multiplier, attempt - 1), maxDelay);

  if (strategy.jitter) {
    // full jitter: uniform random between 0 and computed delay
    delay = Math.random() * delay;
  }

  return Math.round(delay);
};

/** Returns the maximum number of retries from the strategy, defaulting to Infinity. */
export const getMaxRetries = (strategy: KafkaRetryStrategy): number => {
  return strategy.maxRetries ?? Infinity;
};
