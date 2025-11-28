import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { EtcdModule } from "@globalart/nestjs-etcd";
import { ScheduleModule } from "@nestjs/schedule";

@Module({
  imports: [
    EtcdModule.forRoot({
      features: ["leaderElection", "distributedLock"],
      leaderElectionKey: "etcd",
      etcdOptions: {
        hosts: ["localhost:2379"],
      },
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
})
export class AppModule {}
