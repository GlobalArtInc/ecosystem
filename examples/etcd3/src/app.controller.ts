import { Controller, Get, Inject, Post, Body } from "@nestjs/common";
import {
  InjectEtcdLeaderElectionService,
  InjectEtcdDistributedLockService,
  LeaderElectionService,
  DistributedLockService,
} from "@globalart/nestjs-etcd";
import { ProcessDto } from "./app.dtos";

@Controller()
export class AppController {
  constructor(
    @InjectEtcdLeaderElectionService()
    private readonly leaderElectionService: LeaderElectionService,
    @InjectEtcdDistributedLockService()
    private readonly distributedLockService: DistributedLockService
  ) {}

  @Get("is-leader")
  async hello() {
    return {
      message: "Hello World",
      isLeader: this.leaderElectionService.isLeader(),
    };
  }

  @Post("acquire")
  async process(@Body() data: ProcessDto) {
    const lockKey = `process:${data.resourceId}`;
    const hasAcquiredLock = await this.distributedLockService.isLocked(lockKey);
    if (hasAcquiredLock) {
      return {
        message: "Resource is locked, try later",
        resourceId: data.resourceId,
      };
    }
    console.log("Acquiring lock");
    await this.distributedLockService.acquire(lockKey, {
      ttl: 30,
    });

    try {
      return { message: "Processed successfully", resourceId: data.resourceId };
    } finally {
      setTimeout(() => {
        this.distributedLockService.release(lockKey);
      }, 10000);
    }
  }
}
