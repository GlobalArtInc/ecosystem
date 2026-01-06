import { Metadata, MetadataValue } from "@grpc/grpc-js";
import { ExecutionContext } from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { GRPC_METADATA_TOKEN } from "../constants/grpc.constants";
import { randomUUID } from "crypto";

export const setupGrpcFollower = (cls: ClsService, ctx: ExecutionContext) => {
  const type = ctx.getType();
  const GRPC_METADATA =
    cls.get<Record<string, MetadataValue>>(GRPC_METADATA_TOKEN) || {};
  GRPC_METADATA["x-correlation-id"] =
    GRPC_METADATA["x-correlation-id"] || cls.getId() || randomUUID();

  if (type === "rpc") {
    const metadataContext = ctx.switchToRpc().getContext<Metadata>();

    Object.entries(metadataContext.getMap()).forEach(([key, value]) => {
      GRPC_METADATA[key] = value;
    });
    cls.set(GRPC_METADATA_TOKEN, GRPC_METADATA);
  } else if (type === "http") {
    cls.set(GRPC_METADATA_TOKEN, GRPC_METADATA);
  }
};
