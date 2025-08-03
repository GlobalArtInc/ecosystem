import { Controller, Get } from "@nestjs/common";
import { ExcludeLogging } from "@globalart/nestjs-logger";

@Controller()
export class AppController {
  @Get("hello")
  getHello(): string {
    return "Hello World!";
  }

  @ExcludeLogging()
  @Get("hello/exclude-logging")
  getHelloExcludeLogging(): string {
    return "Hello World!";
  }
}
