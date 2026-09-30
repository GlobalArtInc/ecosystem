export class KafkaHandlerTimeoutError extends Error {
  constructor(
    readonly topic: string,
    readonly partition: number,
    readonly offset: string,
    readonly timeoutMs: number,
  ) {
    super(
      `Handler for topic="${topic}" partition=${partition} offset=${offset} did not finish within ${timeoutMs}ms`,
    );
    this.name = "KafkaHandlerTimeoutError";
  }
}
