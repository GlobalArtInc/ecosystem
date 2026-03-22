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
    };
    if (entry.context) obj.context = entry.context;
    if (entry.metadata) obj.metadata = entry.metadata;
    if (entry.trace) obj.trace = entry.trace;
    if (entry.traceId) obj.traceId = entry.traceId;
    if (entry.spanId) obj.spanId = entry.spanId;
    return JSON.stringify(obj);
  }

  formatHttpRequest(entry: HttpRequestLogEntry): string {
    const jsonString = JSON.stringify(entry);
    return this.options.colors
      ? this.colorize(jsonString, this.getColorForLevel(entry.level))
      : jsonString;
  }
}
