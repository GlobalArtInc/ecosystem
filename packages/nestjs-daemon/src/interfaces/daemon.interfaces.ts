import { ModuleMetadata, Type } from "@nestjs/common";
import { AbstractDaemon } from "../abstract.daemon";

export interface DaemonOptions {
  /**
   * Unique name of the daemon (namespace in Redis)
   */
  name: string;

  /**
   * The class that implements the daemon logic
   */
  worker: Type<AbstractDaemon>;

  /**
   * Default interval between executions in milliseconds
   * @default 1000
   */
  defaultInterval?: number;

  /**
   * Run daemon immediately on startup
   * @default false
   */
  runOnStart?: boolean;
}

export interface DaemonModuleAsyncOptions
  extends Pick<ModuleMetadata, "imports"> {
  useFactory: (...args: any[]) => Promise<DaemonOptions> | DaemonOptions;
  inject?: any[];
}

export interface DaemonStatus {
  isRunning: boolean;
  isPaused: boolean;
  lastExecution?: Date;
  lastError?: string;
  totalProcessed: number;
}
