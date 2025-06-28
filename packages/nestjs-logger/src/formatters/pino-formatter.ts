import { Injectable } from "@nestjs/common";
import { BaseFormatter } from "./base-formatter";
import { LogEntry, HttpRequestLogEntry } from "../types";

@Injectable()
export class PinoFormatter extends BaseFormatter {
  format(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  formatHttpRequest(entry: HttpRequestLogEntry): string {
    const jsonString = JSON.stringify(entry);
    return this.options.colors
      ? this.colorize(jsonString, this.getColorForLevel(entry.level))
      : jsonString;
  }
}
