import { Inject } from "@nestjs/common";
import { EtcdLeaderElectionFeatureService } from "./etcd-leader-election.feature-service";
import { EtcdDistributedLockFeatureService } from "./etcd-distributed-lock.feature-service";

export const InjectEtcdLeaderElectionService = () =>
  Inject(EtcdLeaderElectionFeatureService);
export const InjectEtcdDistributedLockService = () =>
  Inject(EtcdDistributedLockFeatureService);
