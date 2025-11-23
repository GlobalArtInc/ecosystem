import { LeaderElectionService } from "./services";

export { EtcdModule } from "./etcd.module";
export {
  InjectEtcdId,
  InjectDistributedSharedRepository,
  InjectEtcdClient,
  EtcdDistributedStateRepository,
  type EtcdModuleOptions,
  type EtcdModuleAsyncOptions,
} from "./core";
export {
  InjectEtcdLeaderElectionService,
  InjectEtcdDistributedLockService,
} from "./services";
export {
  type LeaderElectionService,
  type DistributedLockService,
} from "./services";
