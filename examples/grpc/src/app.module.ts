import { ExecutionContext, Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { EtcdModule } from "@globalart/nestjs-etcd";
import { ScheduleModule } from "@nestjs/schedule";
import { GrpcModule } from "@globalart/nestjs-grpc";
import { join } from "path";
import { ClientMainGrpc } from "./client.grpc";
import { ClsModule, ClsService } from "nestjs-cls";

@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    GrpcModule.forRoot({
      clients: [
        {
          clientName: 'default',
          packageName: 'default',
          protoPath: join(__dirname, '../src/dev.proto'),
          url: 'localhost:50051',
        }
      ]
    }),
    ClsModule.forRoot({
      interceptor: {
        mount: true,
        setup: (cls: ClsService, context: ExecutionContext) => {
          console.log(context.getArgs()[1]);
        }
      }
    })
  ],
  providers: [ClientMainGrpc],
  controllers: [AppController],
})
export class AppModule {}
