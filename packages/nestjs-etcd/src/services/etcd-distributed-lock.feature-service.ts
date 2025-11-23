import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Lock } from "etcd3";
import {
  EtcdDistributedStateRepository,
  InjectDistributedSharedRepository,
  InjectEtcdOptions,
  type EtcdModuleOptions,
} from "../core";

export interface LockOptions {
  ttl?: number;
  timeout?: number;
  retryInterval?: number;
}

@Injectable()
export class EtcdDistributedLockFeatureService implements OnModuleInit {
  private hasFeatureEnabled: boolean = false;
  private readonly defaultTtl: number = 30;
  private readonly defaultTimeout: number = 120000;
  private readonly defaultRetryInterval: number = 100;

  constructor(
    @InjectDistributedSharedRepository()
    private readonly distributedSharedRepository: EtcdDistributedStateRepository,
    @InjectEtcdOptions()
    etcdOptions: EtcdModuleOptions
  ) {
    this.hasFeatureEnabled =
      etcdOptions.features?.includes("distributedLock") || false;
  }

  private readonly logger: Logger = new Logger(
    EtcdDistributedLockFeatureService.name
  );

  async onModuleInit() {
    if (this.hasFeatureEnabled) {
      this.logger.log("Distributed Lock feature enabled");
    }
  }

  async acquire(key: string, options?: LockOptions): Promise<Lock> {
    if (!this.hasFeatureEnabled) {
      throw new Error(
        "Distributed Lock feature is not enabled. Add 'distributedLock' to features array."
      );
    }

    const ttl = options?.ttl ?? this.defaultTtl;
    const timeout = options?.timeout ?? this.defaultTimeout;
    const retryInterval = options?.retryInterval ?? this.defaultRetryInterval;

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const lock = await this.distributedSharedRepository.acquireLock(
          key,
          ttl
        );
        return lock;
      } catch (error) {
        if (Date.now() - startTime >= timeout) {
          throw new Error(
            `Failed to acquire lock for key: ${key} within timeout`
          );
        }
        await this.sleep(retryInterval);
      }
    }

    throw new Error(`Failed to acquire lock for key: ${key} within timeout`);
  }

  async release(key: string): Promise<void> {
    const lock = await this.distributedSharedRepository.getLock(key);
    if (!lock) {
      this.logger.warn(`No active lock found for key: ${key}`);
      return;
    }

    try {
      await this.distributedSharedRepository.releaseLock(lock);
    } catch (error) {
      this.logger.error({
        message: `Failed to release lock for key: ${key}`,
        metadata: { error },
      });
      throw error;
    }
  }

  async isLocked(key: string): Promise<boolean> {
    const lock = await this.distributedSharedRepository.getLock(key);
    return !!lock;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
