import { InjectionToken } from "@nestjs/common";
import { IOptions as EtcdOptions } from "etcd3";

export type EtcdFeature = "leaderElection" | "distributedLock";

export interface EtcdModuleOptions {
  features?: EtcdFeature[];
  leaderElectionKey?: string;
  etcdOptions: EtcdOptions;
}

export interface EtcdModuleAsyncOptions {
  useFactory: (
    ...args: unknown[]
  ) => EtcdModuleOptions | Promise<EtcdModuleOptions>;
  inject?: InjectionToken[];
}
