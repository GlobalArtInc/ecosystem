import { BadRequestException, Controller, Get, Inject } from "@nestjs/common";
import { ExcludeLogging, InjectLogger } from "@globalart/nestjs-logger";
import { LoggerService } from "@globalart/nestjs-logger";

@Controller()
export class AppController {
  constructor(
    @InjectLogger(AppController.name)
    private readonly logger: LoggerService
  ) {}

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
