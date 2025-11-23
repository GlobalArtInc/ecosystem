import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { InjectEtcdClient } from "../core/etcd.di-tokens";
import { Etcd3, Lease, Lock } from "etcd3";
import { InjectEtcdOptions, type EtcdModuleOptions } from "../core";

export interface LockOptions {
  ttl?: number;
}

export interface DistributedLockService {
  acquire(key: string, options?: LockOptions): Promise<Lock | null>;
  release(key: string): Promise<boolean>;
  isLocked(key: string): Promise<boolean>;
}

@Injectable()
export class EtcdDistributedLockFeatureService
  implements DistributedLockService, OnModuleInit, OnModuleDestroy
{
  private hasFeatureEnabled: boolean = false;
  private readonly defaultTtl: number = 10;

  constructor(
    @InjectEtcdClient()
    private readonly etcd: Etcd3,
    @InjectEtcdOptions()
    private readonly etcdOptions: EtcdModuleOptions
  ) {}

  async onModuleInit() {
    this.hasFeatureEnabled =
      this.etcdOptions.features?.includes("distributedLock") || false;
  }

  async onModuleDestroy() {
    if (!this.hasFeatureEnabled) {
      return;
    }

    const lockKey = `acquire/*`;
    const lockValue = await this.etcd.get(lockKey);

    if (lockValue === null) {
      return;
    }

    await this.etcd.delete().key(lockKey);
  }

  async acquire(key: string, options?: LockOptions): Promise<Lock | null> {
    if (!this.hasFeatureEnabled) {
      throw new Error(
        "Distributed lock feature is not enabled. Please enable it in EtcdModuleOptions."
      );
    }

    const ttl = options?.ttl ?? this.defaultTtl;
    const lease = this.etcd.lease(ttl);

    try {
      await lease.grant();
      const lockKey = `acquire/${key}`;

      const lock = this.etcd.lock(lockKey);
      await lock.acquire();

      return lock;
    } catch (error) {
      if (lease) {
        await lease.revoke();
      }
      return null;
    }
  }

  async release(key: string): Promise<boolean> {
    if (!this.hasFeatureEnabled) {
      return false;
    }

    try {
      const lockKey = `acquire/${key}`;
      const lockValue = await this.etcd.get(lockKey);

      if (lockValue === null) {
        return false;
      }

      await this.etcd.delete().key(lockKey);

      return true;
    } catch (error) {
      return false;
    }
  }

  async isLocked(key: string): Promise<boolean> {
    if (!this.hasFeatureEnabled) {
      return false;
    }

    try {
      const lockKey = `acquire/${key}`;
      const lockValue = await this.etcd.get(lockKey);

      return lockValue !== null;
    } catch (error) {
      return false;
    }
  }
}
