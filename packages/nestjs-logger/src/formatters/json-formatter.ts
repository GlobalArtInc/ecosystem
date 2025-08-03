import { Injectable } from "@nestjs/common";
import { BaseFormatter } from "./base-formatter";
import { LogEntry, HttpRequestLogEntry } from "../types";

@Injectable()
export class JsonFormatter extends BaseFormatter {
  format(entry: LogEntry): string {
    const logObject = {
      timestamp: this.formatTimestamp(entry.timestamp),
      level: entry.level,
      message: entry.message,
      ...(entry.context && { context: entry.context }),
      ...(entry.metadata && { metadata: entry.metadata }),
      ...(entry.trace && { trace: entry.trace }),
    };

    return JSON.stringify(logObject);
  }

  formatHttpRequest(entry: HttpRequestLogEntry): string {
    const jsonString = JSON.stringify(entry);

    if (this.options.colors) {
      const color = this.getColorForLevel(entry.level);
      return this.colorize(jsonString, color);
    }

    return jsonString;
  }
}
