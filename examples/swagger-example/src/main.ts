import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle("Cats example")
    .setDescription("The cats API description")
    .setVersion("1.0")
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("", app, documentFactory);

  await app.listen(4500);
  console.log("Application is running on: http://localhost:4500");
}
bootstrap();
