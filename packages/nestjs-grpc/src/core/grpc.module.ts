import { DynamicModule, ExecutionContext, Module } from "@nestjs/common";
import { GrpcClientFactory } from "../factory/grpc-client.factory";
import {
  GRPC_CLIENT_PREFIX,
  GRPC_METADATA_TOKEN,
  GRPC_SERVICE_DI_TOKEN,
} from "../constants/grpc.constants";
import { GrpcService } from "./grpc.service";
import { ClsModule, ClsService } from "nestjs-cls";
import { randomUUID } from "crypto";
import { Metadata, MetadataValue } from "@grpc/grpc-js";
import { setupGrpcFollower } from "./setup-grpc-controller";

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
          global: false,
          middleware: {
            mount: true,
            debug: false,
          },
          interceptor: {
            mount: true,
            debug: false,
            setup: (cls: ClsService, context: ExecutionContext) => {
              setupGrpcFollower(cls, context);
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
