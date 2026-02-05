import { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom, Observable, timer, throwError, retry, of, catchError } from "rxjs";
import { Metadata, MetadataValue, status } from "@grpc/grpc-js";
import { randomUUID } from "crypto";
import { GrpcService, InjectGrpcService } from "./grpc.service";
import { Inject } from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { switchMap } from "rxjs/operators";

type UnwrapObservable<U> = U extends Observable<infer R> ? R : U;

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
        payload: T[K] extends (...args: infer P) => any ? P[0] : never = {} as any,
        retryNullOnError = true,
      ): Promise<UnwrapObservable<T[K] extends (...args: any) => any ? ReturnType<T[K]> : never>> => {
        return this.call<T, K>(serviceName, methodName, payload, retryNullOnError);
      },
    };
  }

  public async call<T extends object, K extends keyof T>(
    serviceName: string,
    methodName: K,
    payload: T[K] extends (...args: infer P) => any ? P[0] : never = {} as any,
    retryNullOnError: boolean,
  ): Promise<UnwrapObservable<T[K] extends (...args: any) => any ? ReturnType<T[K]> : never>> {
    const service = this.client.getService<T>(serviceName);

    const method = service[methodName] as unknown as (
      ...args: any[]
    ) => Observable<any>;

    const stream$ = method(payload, this.getMetadata()).pipe(
      retry({
        delay: (error) => {
          if (
            error?.code === status.UNAVAILABLE ||
            error?.code === status.DEADLINE_EXCEEDED
          ) {
            return timer(5000);
          }
          return throwError(() => error);
        },
      }),
      catchError((error) => {
        if (retryNullOnError) {
          return of(null);
        }
        return throwError(() => error);
      })
    );

    return firstValueFrom(stream$);
  }

  private getMetadata(): Metadata {
    const metadata = new Metadata();

    if (this.grpcService.getMetadata().has("correlation-id")) {
      metadata.set(
        "correlation-id",
        this.grpcService.getMetadata().get("correlation-id") as MetadataValue
      );
    } else {
      const correlationId = randomUUID();
      this.grpcService.addMetadata("correlation-id", correlationId);
      metadata.set("correlation-id", correlationId);
    }

    const storedMetadata = this.grpcService.getMetadata();

    if (storedMetadata) {
      storedMetadata.forEach((value, key) => {
        metadata.set(key, value);
        this.grpcService.addMetadata(key, value);
      });
    }

    return metadata;
  }
}
