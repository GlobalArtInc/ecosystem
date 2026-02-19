import { Injectable } from "@nestjs/common";
import { BaseFormatter } from "./base-formatter";
import { LogEntry, HttpRequestLogEntry } from "../types";

@Injectable()
export class PinoFormatter extends BaseFormatter {
  format(entry: LogEntry): string {
    const obj: Record<string, unknown> = {
      level: entry.level,
      message: entry.message,
      timestamp: entry.timestamp,
      context: entry.context,
      metadata: entry.metadata,
      trace: entry.trace,
    };
    if (entry.traceId) obj.traceId = entry.traceId;
    if (entry.spanId) obj.spanId = entry.spanId;
    return JSON.stringify(obj);
  }

  formatHttpRequest(entry: HttpRequestLogEntry): string {
    const obj = { ...entry };
    if (entry.traceId) obj.traceId = entry.traceId;
    if (entry.spanId) obj.spanId = entry.spanId;
    const jsonString = JSON.stringify(obj);
    return this.options.colors
      ? this.colorize(jsonString, this.getColorForLevel(entry.level))
      : jsonString;
  }
}
