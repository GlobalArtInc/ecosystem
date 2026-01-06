import { MicroserviceOptions } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { NestApplication, NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ShutdownSignal } from "@nestjs/common";
import { getGrpcConfig } from '@globalart/nestjs-grpc';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestApplication>(AppModule);
  await app.listen(4500);
  console.log("Application is running on: http://localhost:4500");
}
bootstrap();
