import { Logger } from "@nestjs/common";

export abstract class AbstractDaemon<T = any> {
  protected readonly logger: Logger;

  constructor(context: string) {
    this.logger = new Logger(context);
  }

  /**
   * The main business logic of the daemon.
   * This method will be called repeatedly by the DaemonService.
   *
   * @param data Optional data passed from the runner or Redis
   */
  abstract perform(data?: T): Promise<boolean | void>;

  /**
   * Hook called before the perform cycle
   */
  async onStart(): Promise<void> {}

  /**
   * Hook called when the daemon is stopped/paused
   */
  async onStop(): Promise<void> {}

  /**
   * Hook for handling errors
   */
  async onError(error: Error): Promise<void> {
    this.logger.error(
      `Error in daemon execution: ${error.message}`,
      error.stack
    );
  }
}
