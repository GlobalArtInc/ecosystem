const FATAL_CONSUMER_PATTERN = /Local: Fatal error/i;

export function isFatalConsumerMessage(message: unknown): boolean {
  return typeof message === "string" && FATAL_CONSUMER_PATTERN.test(message);
}
