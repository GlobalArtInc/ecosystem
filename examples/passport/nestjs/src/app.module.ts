import { Module, RequestMethod } from "@nestjs/common";
import { AppController } from "./app.controller";
import { GlobalArtAuthStrategy } from "./auth.strategy";

@Module({
  imports: [],
  controllers: [AppController],
  providers: [GlobalArtAuthStrategy],
})
export class AppModule {}
