import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { EtcdModule } from "@globalart/nestjs-etcd";
import { ScheduleModule } from "@nestjs/schedule";
import { GrpcModule } from "@globalart/nestjs-grpc";
import { join } from "path";
import { ClientMainGrpc } from "./client.grpc";
import { ClsModule } from "nestjs-cls";

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
    })
  ],
  controllers: [AppController],
})
export class AppModule {}
