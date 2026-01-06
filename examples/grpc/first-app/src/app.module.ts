import { ExecutionContext, Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { GrpcModule, setupGrpcFollower } from "@globalart/nestjs-grpc";
import { join } from "path";
import { ClientMainGrpc } from "./client.grpc";
import { ClsModule, ClsService } from "nestjs-cls";

@Module({
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
    ClsModule.forRoot({
      global: true,
      interceptor: {
        mount: true,
        debug: false,
        setup: (cls: ClsService, context: ExecutionContext) => {
          setupGrpcFollower(cls, context);
        },
      },
    }),
  ],
  providers: [ClientMainGrpc],
  controllers: [AppController],
})
export class AppModule {}
