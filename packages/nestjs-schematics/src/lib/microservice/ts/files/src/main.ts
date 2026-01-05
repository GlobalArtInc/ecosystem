import { ZodValidationPipe } from '@globalart/nestjs-zod';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

class Bootstrap {
  private app: INestApplication;

  async init() {
    this.app = await NestFactory.create<INestApplication>(AppModule);
    this.app.useGlobalPipes(new ZodValidationPipe());
  }

  async start() {
    await this.app.listen(0);
    await this.app.startAllMicroservices();
  }
}

(async () => {
  const bootstrap = new Bootstrap();
  await bootstrap.init();
  await bootstrap.start();
})();
