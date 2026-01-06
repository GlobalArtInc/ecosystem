import { DynamicModule, ExecutionContext, Module } from "@nestjs/common";
import { GrpcClientFactory } from "../factory/grpc-client.factory";
import { GRPC_CLIENT_PREFIX } from "../constants/grpc.constants";
import { GRPC_SERVICE_DI_TOKEN, GrpcService } from "./grpc.service";
import { ClsModule, ClsService } from "nestjs-cls";
import { randomUUID } from "crypto";
import { Metadata, MetadataValue } from "@grpc/grpc-js";

interface GrpcOptionsClient {
  clientName: string;
  packageName: string;
  protoPath: string;
  url: string;
}

interface GrpcOptions {
  clients: GrpcOptionsClient[];
}

@Module({})
export class GrpcModule {
  static forRoot(options: GrpcOptions): DynamicModule {
    return {
      module: GrpcModule,
      global: true,
      imports: [
        ClsModule.forRoot({
          interceptor: {
            mount: true,
            generateId: true,
            idGenerator: () => randomUUID(),
            setup: (cls: ClsService, ctx: ExecutionContext) => {
              const type = ctx.getType();
              const GRPC_METADATA =
                cls.get<Record<string, MetadataValue>>("GRPC_METADATA") || {};
              GRPC_METADATA["x-correlation-id"] =
                GRPC_METADATA["x-correlation-id"] || cls.getId();

              if (type === "rpc") {
                const metadataContext = ctx
                  .switchToRpc()
                  .getContext<Metadata>();

                Object.entries(metadataContext.getMap()).forEach(
                  ([key, value]) => {
                    GRPC_METADATA[key] = value;
                  }
                );
                cls.set("GRPC_METADATA", GRPC_METADATA);
              } else if (type === "http") {
                cls.set("GRPC_METADATA", GRPC_METADATA);
              }
            },
          },
        }),
      ],
      providers: [
        GrpcClientFactory,
        {
          provide: GRPC_SERVICE_DI_TOKEN,
          useClass: GrpcService,
        },
        ...options.clients.map((client) => {
          const token = `${GRPC_CLIENT_PREFIX}_${client.clientName}`;

          return {
            provide: token,
            useFactory: (factory: GrpcClientFactory) => {
              const grpcClient = factory.createClient({
                package: client.packageName,
                protoPath: client.protoPath,
                url: client.url,
              });
              factory.register(token, grpcClient);

              return grpcClient;
            },
            inject: [GrpcClientFactory],
          };
        }),
      ],
      exports: [
        GRPC_SERVICE_DI_TOKEN,
        ClsModule,
        ...options.clients.map(
          (client) => `${GRPC_CLIENT_PREFIX}_${client.clientName}`
        ),
      ],
    };
  }
}
