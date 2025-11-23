import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Campaign, Etcd3 } from "etcd3";
import {
  EtcdDistributedStateRepository,
  InjectDistributedSharedRepository,
  InjectEtcdClient,
  InjectEtcdId,
  InjectEtcdOptions,
  type EtcdModuleOptions,
} from "../core";

@Injectable()
export class EtcdLeaderElectionFeatureService
  implements OnModuleInit, OnModuleDestroy
{
  private leaderKey: string = "etcd";
  private isLeaderFlag = false;
  private hasFeatureEnabled: boolean = false;
  private leaderCampaign: Campaign | null = null;

  constructor(
    @InjectEtcdOptions()
    private readonly etcdOptions: EtcdModuleOptions,
    @InjectDistributedSharedRepository()
    private readonly distributedSharedRepository: EtcdDistributedStateRepository,
    @InjectEtcdId()
    private readonly leaderId: string
  ) {
    this.hasFeatureEnabled =
      etcdOptions.features?.includes("leaderElection") || false;
  }
  private readonly logger: Logger = new Logger(
    EtcdLeaderElectionFeatureService.name
  );

  async onModuleInit() {
    if (this.hasFeatureEnabled) {
      if (this.etcdOptions.leaderElectionKey) {
        this.leaderKey = this.etcdOptions.leaderElectionKey;
      }
      await this.attemptToBecomeLeader();
    }
  }

  async onModuleDestroy() {
    if (this.hasFeatureEnabled && this.leaderCampaign) {
      await this.distributedSharedRepository.resignLeader(this.leaderCampaign);
    }
  }

  public isLeader(): boolean {
    return this.isLeaderFlag;
  }

  private async attemptToBecomeLeader() {
    this.leaderCampaign = await this.distributedSharedRepository.getElection(
      this.leaderKey,
      10,
      this.leaderId
    );
    this.leaderCampaign.on("elected", async () => {
      this.isLeaderFlag = true;
      this.logger.log(`I am leader ${this.leaderId}`);
    });
    this.leaderCampaign.on("error", async (err) => {
      this.isLeaderFlag = false;
      this.logger.error({
        message: "Leader election error",
        metadata: {
          error: err,
        },
      });
      await this.attemptToBecomeLeader();
    });
  }
}
