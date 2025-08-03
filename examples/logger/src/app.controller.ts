import { Controller, Get, Post, Body, UseInterceptors } from "@nestjs/common";
import { LoggerService, HttpLoggerInterceptor } from "@globalart/nestjs-logger";
import { LogContext, LogMetadata } from "@globalart/nestjs-logger";

@Controller()
@LogContext("AppController")
export class AppController {
  @Get("hello")
  getHello(): string {
    return "Hello World!";
  }
}
