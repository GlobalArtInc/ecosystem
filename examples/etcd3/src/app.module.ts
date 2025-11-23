import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { EtcdModule } from "@globalart/nestjs-etcd";

@Module({
  imports: [
    EtcdModule.forRoot({
      features: ["leaderElection", "distributedLock"],
      leaderElectionKey: "etcd",
      etcdOptions: {
        hosts: ["localhost:2370"],
      },
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
