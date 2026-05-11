/** Formats an error (including nested causes and AggregateError) to a readable string. */
export const formatError = (err: unknown, depth = 0): string => {
  if (depth > 3) return String(err);
  if (err instanceof AggregateError && err.errors?.length) {
    const causes = err.errors
      .map((e: unknown) => formatError(e, depth + 1))
      .join("; ");
    return `${err.message} [${causes}]`;
  }
  if (err instanceof Error && err.cause) {
    return `${err.message} (caused by: ${formatError(err.cause, depth + 1)})`;
  }
  return String(err);
};

/** Returns a promise that resolves after the given number of milliseconds. */
export const sleepMs = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
