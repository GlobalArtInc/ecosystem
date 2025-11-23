import { Controller, Get, Inject, Post, Body } from "@nestjs/common";
import {
  EtcdLeaderElectionFeatureService,
  EtcdDistributedLockFeatureService,
} from "@globalart/nestjs-etcd";
import { ProcessDto } from "./app.dtos";

@Controller()
export class AppController {
  constructor(
    @Inject(EtcdLeaderElectionFeatureService)
    private readonly etcdLeaderElectionFeatureService: EtcdLeaderElectionFeatureService,
    @Inject(EtcdDistributedLockFeatureService)
    private readonly etcdDistributedLockFeatureService: EtcdDistributedLockFeatureService
  ) {}

  @Get("is-leader")
  async hello() {
    return {
      message: "Hello World",
      isLeader: this.etcdLeaderElectionFeatureService.isLeader(),
    };
  }

  @Post("acquire")
  async process(@Body() data: ProcessDto) {
    const lockKey = `process:${data.resourceId}`;
    const hasAcquiredLock =
      this.etcdDistributedLockFeatureService.isLocked(lockKey);
    if (hasAcquiredLock) {
      return {
        message: "Resource is locked, try later",
        resourceId: data.resourceId,
      };
    }
    await this.etcdDistributedLockFeatureService.acquire(lockKey);

    try {
      await new Promise((resolve) => setTimeout(resolve, 12000));
      return { message: "Processed successfully", resourceId: data.resourceId };
    } finally {
      await this.etcdDistributedLockFeatureService.release(lockKey);
    }
  }
}
