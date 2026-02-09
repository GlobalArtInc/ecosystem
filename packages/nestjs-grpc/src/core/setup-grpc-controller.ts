import { Metadata, MetadataValue } from "@grpc/grpc-js";
import { ExecutionContext } from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { GRPC_METADATA_TOKEN } from "../constants/grpc.constants";
import { randomUUID } from "crypto";

export const setupGrpcFollower = (cls: ClsService, ctx: ExecutionContext) => {
  const GRPC_METADATA =
    cls.get<Record<string, MetadataValue>>(GRPC_METADATA_TOKEN) || {};
  GRPC_METADATA["correlation-id"] =
    GRPC_METADATA["correlation-id"] || cls.getId() || randomUUID();

  if (ctx.getType() === "rpc") {
    const metadataContext = ctx.switchToRpc().getContext<Metadata>();

    try {
      Object.entries(metadataContext.getMap()).forEach(([key, value]) => {
        GRPC_METADATA[key] = value;
      });
    } catch (error) {
      
    }
    cls.set(GRPC_METADATA_TOKEN, GRPC_METADATA);
  } else if (ctx.getType() === "http") {
    cls.set(GRPC_METADATA_TOKEN, GRPC_METADATA);
  }
};
