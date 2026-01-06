import { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom, Observable } from "rxjs";
import { Metadata } from "@grpc/grpc-js";
import { randomUUID } from "crypto";
import { GrpcService, InjectGrpcService } from "./grpc.service";

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
    if (this.grpcService.getMetadata()["x-correlation-id"]) {
      metadata.set(
        "x-correlation-id",
        this.grpcService.getMetadata()["x-correlation-id"]
      );
    } else {
      const correlationId = randomUUID();
      this.grpcService.addMetadata("x-correlation-id", correlationId);
      metadata.set("x-correlation-id", correlationId);
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
