import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { RedisModule } from "@globalart/nestjs-redis";

@Module({
  imports: [
    RedisModule.forRoot({
      isGlobal: true,
      type: 'sentinel',
      options: {
        name: 'mymaster',
        sentinelRootNodes: [
          {
            host: 'sentinel.base-dev.svc.cluster.local',
            port: 26379,
          }
        ],
      }
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
