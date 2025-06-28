import { Injectable } from "@nestjs/common";
import { ILogFormatter } from "../contracts";
import { LogFormat, FormatterOptions } from "../types";
import { TextFormatter } from "../formatters/text-formatter";
import { JsonFormatter } from "../formatters/json-formatter";
import { PinoFormatter } from "../formatters/pino-formatter";

@Injectable()
export class FormatterFactory {
  create(format: LogFormat, options: FormatterOptions): ILogFormatter {
    switch (format) {
      case "text":
        return new TextFormatter(options);
      case "json":
        return new JsonFormatter(options);
      case "pino":
        return new PinoFormatter(options);
      default:
        throw new Error(`Unsupported log format: ${format}`);
    }
  }
}
