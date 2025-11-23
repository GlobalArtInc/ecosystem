import { IOptions as EtcdOptions } from "etcd3";

export type EtcdFeature = "leaderElection";

export interface EtcdModuleOptions {
  features?: EtcdFeature[];
  leaderElectionKey?: string;
  etcdOptions: EtcdOptions;
}

export interface EtcdModuleAsyncOptions {
  useFactory: (
    ...args: unknown[]
  ) => EtcdModuleOptions | Promise<EtcdModuleOptions>;
  inject?: any[];
}
