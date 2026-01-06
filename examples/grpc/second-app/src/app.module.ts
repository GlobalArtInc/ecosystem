import { DynamicModule, ExecutionContext, Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AbstractGrpcClient, GrpcModule } from "@globalart/nestjs-grpc";
import { join } from "path";
import { ClientMainGrpc } from "./client.grpc";
import { ClsModule, ClsService } from "nestjs-cls";
import { ClientGrpc } from "@nestjs/microservices";

@Module({})
export class GrModule {
  static forRoot(): DynamicModule {
    return {
      module: GrModule,
      global: true,
      imports: [
        GrpcModule.forRoot({
          clients: [
            {
              clientName: "default",
              packageName: "default",
              protoPath: join(__dirname, "../src/dev.proto"),
              url: "localhost:50051",
            },
          ],
        }),
      ],
      providers: [ClientMainGrpc],
      exports: [ClientMainGrpc],
    };
  }
}

@Module({
  imports: [
    GrModule.forRoot(),
    ClsModule.forRoot({
      global: true,
      interceptor: {
        mount: true,
        setup: (cls: ClsService, context: ExecutionContext) => {
          // console.log('interceptor setup');
        },
      },
    }),
  ],
  providers: [ClientMainGrpc],
  controllers: [AppController],
})
export class AppModule {}
