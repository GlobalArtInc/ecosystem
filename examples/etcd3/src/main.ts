import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ShutdownSignal } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const randomPort = Math.floor(Math.random() * (50000 - 40000 + 1)) + 40000;

  app.enableShutdownHooks([ShutdownSignal.SIGINT, ShutdownSignal.SIGTERM]);
  await app.listen(randomPort);
  console.log(`Application is running on: http://localhost:${randomPort}`);
}
bootstrap();
