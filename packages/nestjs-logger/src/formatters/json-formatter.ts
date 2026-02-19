import { Injectable } from "@nestjs/common";
import { BaseFormatter } from "./base-formatter";
import { LogEntry, HttpRequestLogEntry } from "../types";

@Injectable()
export class JsonFormatter extends BaseFormatter {
  format(entry: LogEntry): string {
    const logObject = this.buildLogObject(entry);
    return JSON.stringify(logObject);
  }

  formatHttpRequest(entry: HttpRequestLogEntry): string {
    const jsonString = JSON.stringify(entry);
    return this.options.colors
      ? this.colorize(jsonString, this.getColorForLevel(entry.level))
      : jsonString;
  }

  private buildLogObject(entry: LogEntry): Record<string, unknown> {
    const baseObject = {
      timestamp: this.formatTimestamp(entry.timestamp),
      level: entry.level,
      message: entry.message,
    };

    return this.addOptionalFields(baseObject, entry);
  }

  private addOptionalFields(
    baseObject: Record<string, unknown>,
    entry: LogEntry
  ): Record<string, unknown> {
    const result = { ...baseObject };

    if (entry.context) {
      result.context = entry.context;
    }

    if (entry.metadata) {
      result.metadata = entry.metadata;
    }

    if (entry.trace) {
      result.trace = entry.trace;
    }

    if (entry.traceId) {
      result.traceId = entry.traceId;
    }

    if (entry.spanId) {
      result.spanId = entry.spanId;
    }

    return result;
  }
}
