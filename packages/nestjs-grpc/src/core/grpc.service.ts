import { Cache } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import { ClsService } from "nestjs-cls";

export const GRPC_SERVICE_DI_TOKEN = Symbol("GRPC_SERVICE");
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

  public getMetadata(): Record<string, string> {
    return this.cls.get<Record<string, string>>("GRPC_METADATA") || {};
  }
}
