export class TemporalConnectionError extends Error {
  constructor(cause: unknown) {
    super(
      `Failed to connect to the Temporal server: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
    this.name = 'TemporalConnectionError';
  }
}

export class TemporalWorkerCreationError extends Error {
  constructor(taskQueue: string | undefined, cause: unknown) {
    super(
      `Failed to create Temporal worker for task queue "${taskQueue}": ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
    this.name = 'TemporalWorkerCreationError';
  }
}

export class DuplicateActivityError extends Error {
  constructor(violations: Record<string, string[]>) {
    super(
      `Activity names must be unique across all Activity classes. Identified activities with conflicting names: ${JSON.stringify(violations)}`,
    );
    this.name = 'DuplicateActivityError';
  }
}

export class UnsupportedActivityScopeError extends Error {
  constructor(activityName: string, className: string) {
    super(
      `Request-scoped and transient activities are not supported. Activity "${activityName}" from class "${className}" resolves to a single shared instance for all activity executions, which would silently leak state across concurrent calls. Use a singleton-scoped (default) provider instead.`,
    );
    this.name = 'UnsupportedActivityScopeError';
  }
}
