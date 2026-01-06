import { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom, Observable } from "rxjs";
import { Metadata, MetadataValue } from "@grpc/grpc-js";
import { randomUUID } from "crypto";
import { GrpcService, InjectGrpcService } from "./grpc.service";
import { GRPC_METADATA_TOKEN } from "../constants/grpc.constants";
import { Inject } from "@nestjs/common";
import { ClsService } from "nestjs-cls";

type UnwrapObservable<U> = U extends Observable<infer R> ? R : U;
type GrpcClientServiceOutput<
  T extends object,
  K extends keyof T
> = T[K] extends (...args: any) => any
  ? UnwrapObservable<ReturnType<T[K]>>
  : never;

export abstract class AbstractGrpcClient {
  protected constructor(private readonly client: ClientGrpc) {}

  @InjectGrpcService()
  protected readonly grpcService!: GrpcService;
  @Inject(ClsService)
  protected readonly cls!: ClsService;

  public service<T extends object>(serviceName: string) {
    return {
      call: <K extends keyof T>(
        methodName: K,
        payload: T[K] extends (...args: infer P) => any
          ? P[0]
          : never = {} as any
      ): Promise<GrpcClientServiceOutput<T, K>> => {
        return this.call<T, K>(serviceName, methodName, payload);
      },
    };
  }

  public async call<T extends object, K extends keyof T>(
    serviceName: string,
    methodName: K,
    payload: T[K] extends (...args: infer P) => any ? P[0] : never = {} as any
  ): Promise<
    T[K] extends (...args: any) => any
      ? UnwrapObservable<ReturnType<T[K]>>
      : never
  > {
    try {
      const service = this.client.getService<T>(serviceName);

      const method = service[methodName] as unknown as (
        ...args: any[]
      ) => Observable<any>;

      return firstValueFrom(method(payload, this.getMetadata()));
    } catch (error) {
      throw error;
    }
  }

  private getMetadata(): Metadata {
    const metadata = new Metadata();
    if (this.grpcService.getMetadata()["correlation-id"]) {
      metadata.set(
        "correlation-id",
        this.grpcService.getMetadata()["correlation-id"]
      );
    } else {
      const correlationId = randomUUID();
      this.grpcService.addMetadata("correlation-id", correlationId);
      metadata.set("correlation-id", correlationId);
    }

    const storedMetadata = this.grpcService.getMetadata();
    if (storedMetadata) {
      Object.keys(storedMetadata).forEach((key) => {
        metadata.set(key, storedMetadata[key]);
      });
    }

    return metadata;
  }
}
