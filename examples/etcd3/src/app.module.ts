import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { EtcdModule } from "@globalart/nestjs-etcd";

@Module({
  imports: [
    EtcdModule.forRoot({
      features: ["leaderElection"],
      leaderElectionKey: "etcd",
      etcdOptions: {
        hosts: ["localhost:2379"],
      },
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
