import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { HttpLoggerInterceptor } from "@globalart/nestjs-logger";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // @ts-ignore
    new FastifyAdapter()
  );

  await app.register(require("@fastify/multipart"));

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    })
  );

  app.useGlobalInterceptors(app.get(HttpLoggerInterceptor));
  const config = new DocumentBuilder()
    .setTitle("Cats example")
    .setDescription("The cats API description")
    .setVersion("1.0")
    .build();
  const documentFactory = () =>
    SwaggerModule.createDocument(app as any, config);
  SwaggerModule.setup("", app as any, documentFactory);

  await app.listen(4500, "0.0.0.0");
  console.log("Application is running on: http://localhost:4500/info");
}
bootstrap();
