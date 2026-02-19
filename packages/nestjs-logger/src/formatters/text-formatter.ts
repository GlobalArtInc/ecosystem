import { Injectable } from "@nestjs/common";
import { BaseFormatter } from "./base-formatter";
import { LogEntry, HttpRequestLogEntry } from "../types";

@Injectable()
export class TextFormatter extends BaseFormatter {
  format(entry: LogEntry): string {
    const parts = this.buildLogParts(entry);
    const result = parts.join(" ");

    return entry.trace ? this.addTrace(result, entry.trace) : result;
  }

  formatHttpRequest(entry: HttpRequestLogEntry): string {
    return JSON.stringify(entry);
  }

  private buildLogParts(entry: LogEntry): string[] {
    const parts: string[] = [];

    this.addTimestamp(parts, entry);
    this.addLevel(parts, entry);
    this.addContext(parts, entry);
    this.addMessage(parts, entry);
    this.addMetadata(parts, entry);
    this.addTraceIds(parts, entry);

    return parts;
  }

  private addTraceIds(parts: string[], entry: LogEntry): void {
    if (entry.traceId || entry.spanId) {
      const ids = [entry.traceId, entry.spanId].filter(Boolean).join("/");
      parts.push(this.colorize(`[${ids}]`, "magenta"));
    }
  }

  private addTimestamp(parts: string[], entry: LogEntry): void {
    if (this.options.timestamp) {
      const timestamp = this.colorize(
        `[${this.formatTimestamp(entry.timestamp)}]`,
        "gray"
      );
      parts.push(timestamp);
    }
  }

  private addLevel(parts: string[], entry: LogEntry): void {
    const level = this.colorize(
      `[${entry.level.toUpperCase()}]`,
      this.getColorForLevel(entry.level)
    );
    parts.push(level);
  }

  private addContext(parts: string[], entry: LogEntry): void {
    if (entry.context) {
      const context = this.colorize(`[${entry.context}]`, "cyan");
      parts.push(context);
    }
  }

  private addMessage(parts: string[], entry: LogEntry): void {
    const message = this.colorize(entry.message, "bright");
    parts.push(message);
  }

  private addMetadata(parts: string[], entry: LogEntry): void {
    if (this.hasMetadata(entry)) {
      const metadata = this.colorize(JSON.stringify(entry.metadata), "gray");
      parts.push(metadata);
    }
  }

  private hasMetadata(entry: LogEntry): boolean {
    return Boolean(entry.metadata && Object.keys(entry.metadata).length > 0);
  }

  private addTrace(result: string, trace: string): string {
    const coloredTrace = this.colorize(trace, "red");
    return `${result}\n${coloredTrace}`;
  }
}
