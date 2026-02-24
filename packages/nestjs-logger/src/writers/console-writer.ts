import { Injectable } from "@nestjs/common";
import type { ILogWriter, LogLevel } from "../contracts";

const CONSOLE_BY_LEVEL: Record<LogLevel, (msg: string) => void> = {
  error: (msg) => console.error(msg),
  warn: (msg) => console.warn(msg),
  info: (msg) => console.log(msg),
  debug: (msg) => console.debug(msg),
  verbose: (msg) => console.log(msg),
};

@Injectable()
export class ConsoleWriter implements ILogWriter {
  write(formattedLog: string, level?: LogLevel): void {
    const out = level ? CONSOLE_BY_LEVEL[level] : console.log;
    out(formattedLog);
  }
}
