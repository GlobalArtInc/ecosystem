import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { GlobalArtAuthStrategy } from "./auth.strategy";
import { SessionService } from "./session.service";
import { SessionGuard } from "./session.guard";

@Module({
  controllers: [AppController],
  providers: [GlobalArtAuthStrategy, SessionService, SessionGuard],
})
export class AppModule {}
