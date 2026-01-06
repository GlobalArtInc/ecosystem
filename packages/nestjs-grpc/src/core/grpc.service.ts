import { MetadataValue } from "@grpc/grpc-js";
import { Cache } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { GRPC_SERVICE_DI_TOKEN } from "../constants";

export const InjectGrpcService = () => Inject(GRPC_SERVICE_DI_TOKEN);

@Injectable()
export class GrpcService {
  constructor(private readonly cls: ClsService) {}

  public async addMetadata(key: string, value: string): Promise<void> {
    const metadata =
      this.cls.get<Record<string, string>>("GRPC_METADATA") || {};
    metadata[key] = value;
    this.cls.set("GRPC_METADATA", metadata);
  }

  public getMetadata(): Record<string, MetadataValue> {
    return this.cls.get<Record<string, MetadataValue>>("GRPC_METADATA") || {};
  }
}
