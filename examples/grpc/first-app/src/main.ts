import { MicroserviceOptions } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ShutdownSignal } from "@nestjs/common";
import { getGrpcConfig } from '@globalart/nestjs-grpc';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, getGrpcConfig({
    packageName: 'default',
    protoPath: join(__dirname, '../src/dev.proto'),
    url: '0.0.0.0:50051',
  }));
  await app.listen();
}
bootstrap();
