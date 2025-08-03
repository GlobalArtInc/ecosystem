import { Injectable } from "@nestjs/common";
import { BaseFormatter } from "./base-formatter";
import { LogEntry, HttpRequestLogEntry } from "../types";

@Injectable()
export class TextFormatter extends BaseFormatter {
  format(entry: LogEntry): string {
    const parts: string[] = [];

    if (this.options.timestamp) {
      const timestamp = this.colorize(
        `[${this.formatTimestamp(entry.timestamp)}]`,
        "gray"
      );
      parts.push(timestamp);
    }

    const level = this.colorize(
      `[${entry.level.toUpperCase()}]`,
      this.getColorForLevel(entry.level)
    );
    parts.push(level);

    if (entry.context) {
      const context = this.colorize(`[${entry.context}]`, "cyan");
      parts.push(context);
    }

    const message = this.colorize(entry.message, "bright");
    parts.push(message);

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      const metadata = this.colorize(JSON.stringify(entry.metadata), "gray");
      parts.push(metadata);
    }

    let result = parts.join(" ");

    if (entry.trace) {
      const trace = this.colorize(entry.trace, "red");
      result += `\n${trace}`;
    }

    return result;
  }

  formatHttpRequest(entry: HttpRequestLogEntry): string {
    return JSON.stringify(entry);
  }
}
