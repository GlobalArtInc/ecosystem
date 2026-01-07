import { MetadataValue } from "@grpc/grpc-js";
import { Inject, Injectable } from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { GRPC_SERVICE_DI_TOKEN } from "../constants";

export const InjectGrpcService = () => Inject(GRPC_SERVICE_DI_TOKEN);

@Injectable()
export class GrpcService {
  constructor(private readonly cls: ClsService) {}

  public addMetadata(key: string, value: MetadataValue): void {
    const metadata =
      this.cls.get<Record<string, MetadataValue>>("GRPC_METADATA") || {};
    metadata[key] = value;
    this.cls.set("GRPC_METADATA", metadata);
  }

  public getMetadata(): Map<string, MetadataValue> {
    const grpcMetadata =
      this.cls.get<Map<string, MetadataValue>>("GRPC_METADATA");
    if (grpcMetadata) {
      return new Map(
        Object.entries(grpcMetadata).map(([key, value]) => [key, value])
      );
    } else {
      return new Map<string, MetadataValue>();
    }
  }
}
