import { DynamicModule, Module } from "@nestjs/common";
import { GrpcClientFactory } from "./factory/grpc-client.factory";
import { GRPC_CLIENT_PREFIX } from "./constants/grpc.constants";
import { GrpcService } from "./grpc.service";
import { ClsModule, ClsInterceptor } from "nestjs-cls";
import { APP_INTERCEPTOR } from "@nestjs/core";

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
      imports: [ClsModule],
      providers: [
        GrpcService,
        GrpcClientFactory,
        {
          provide: APP_INTERCEPTOR,
          useClass: ClsInterceptor,
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
          }
        }),
      ],
      exports: [
        GrpcService,
        ...options.clients.map((client) => `${GRPC_CLIENT_PREFIX}_${client.clientName}`)
      ],
    }
  }
}
