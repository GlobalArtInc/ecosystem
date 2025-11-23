import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ShutdownSignal } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const randomPort =
    process.env.PORT || Math.floor(Math.random() * (50000 - 40000 + 1)) + 40000;

  const config = new DocumentBuilder()
    .setTitle("Cats example")
    .setDescription("The cats API description")
    .setVersion("1.0")
    .addTag("cats")
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("/", app, documentFactory);

  app.enableShutdownHooks([ShutdownSignal.SIGINT, ShutdownSignal.SIGTERM]);
  await app.listen(randomPort);
  console.log(`Application is running on: http://localhost:${randomPort}`);
}
bootstrap();
