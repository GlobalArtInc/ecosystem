import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { LoggerModule } from "@globalart/nestjs-logger";

@Module({
  imports: [
    LoggerModule.forRoot({
      level: "debug",
      timestamp: true,
      colors: true,
      format: "pino",
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
