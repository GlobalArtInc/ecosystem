import { NestApplication, NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestApplication>(AppModule);
  await app.listen(4500);
  console.log("Application is running on: http://localhost:4500");
}
bootstrap();
