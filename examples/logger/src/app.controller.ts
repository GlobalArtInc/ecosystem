import { BadRequestException, Controller, Get } from "@nestjs/common";
import { ExcludeLogging } from "@globalart/nestjs-logger";
import { LoggerService } from "@globalart/nestjs-logger";

@Controller()
export class AppController {
  constructor(private readonly logger: LoggerService) {}

  @Get("info")
  loggerInfo(): string {
    this.logger.log({
      message: "Hello World!",
    });
    return "Hello World!";
  }

  @Get("error")
  loggerError(): string {
    throw new BadRequestException("Error!");
  }

  @ExcludeLogging()
  @Get("hello/exclude-logging")
  getHelloExcludeLogging(): string {
    return "Hello World!";
  }
}
