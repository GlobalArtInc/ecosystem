import { Injectable } from "@nestjs/common";
import { Campaign, Etcd3, Lock } from "etcd3";
import { InjectEtcdClient } from "./etcd.di-tokens";

export interface DistributedStateRepository {
  resignLeader(campaign: Campaign): Promise<void>;
  getElection(
    name: string,
    ttl: number,
    participantId: string
  ): Promise<Campaign>;
  acquireLock(key: string, ttl: number): Promise<Lock>;
  releaseLock(lock: Lock): Promise<void>;
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

  async getElection(
    name: string,
    ttl: number,
    participantId: string
  ): Promise<Campaign> {
    return this.etcd.election(name, ttl).campaign(participantId);
  }

  async getLock(key: string): Promise<Lock> {
    return this.etcd.lock(key);
  }

  async acquireLock(key: string, ttl: number): Promise<Lock> {
    await this.etcd.lease(ttl).grant();
    return this.etcd.lock(key).acquire();
  }

  async releaseLock(lock: Lock): Promise<void> {
    return lock.release();
  }
}
