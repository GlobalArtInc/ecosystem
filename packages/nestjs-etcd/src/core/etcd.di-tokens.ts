import { Inject } from "@nestjs/common";

export const DISTRIBUTED_SHARED_REPOSITORY = Symbol(
  "DISTRIBUTED_SHARED_REPOSITORY"
);
export const ETCD_CLIENT = Symbol("ETCD_CLIENT");
export const ETCD_UNIQUE_ID = Symbol("ETCD_UNIQUE_ID");
export const ETCD_OPTIONS = Symbol("ETCD_OPTIONS");

export const InjectDistributedSharedRepository = () =>
  Inject(DISTRIBUTED_SHARED_REPOSITORY);
export const InjectEtcdId = () => Inject(ETCD_UNIQUE_ID);
export const InjectEtcdClient = () => Inject(ETCD_CLIENT);
export const InjectEtcdOptions = () => Inject(ETCD_OPTIONS);
