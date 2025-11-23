import { Injectable } from "@nestjs/common";
import { Campaign, Etcd3 } from "etcd3";
import { InjectEtcdClient } from "./etcd.di-tokens";

export interface DistributedStateRepository {
  resignLeader(campaign: Campaign): Promise<void>;
  getElection(name: string, ttl: number, participantId: string): Campaign;
}

@Injectable()
export class EtcdDistributedStateRepository
  implements DistributedStateRepository
{
  constructor(
    @InjectEtcdClient()
    private readonly etcd: Etcd3
  ) {}

  resignLeader(campaign: Campaign): Promise<void> {
    return campaign.resign();
  }

  getElection(name: string, ttl: number, participantId: string): Campaign {
    return this.etcd.election(name, ttl).campaign(participantId);
  }
}
