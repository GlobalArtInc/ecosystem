import { ILogFormatter } from "../contracts";
import { LogEntry, HttpRequestLogEntry, FormatterOptions } from "../types";
import { COLORS, OPAQUE_LOG_FIELDS } from "../constants";

export abstract class BaseFormatter implements ILogFormatter {
  constructor(protected readonly options: FormatterOptions) {}

  abstract format(entry: LogEntry): string;

  abstract formatHttpRequest(entry: HttpRequestLogEntry): string;

  protected applyFieldNaming<T>(value: T): T | unknown {
    if (this.options.fieldNaming !== "snake_case") {
      return value;
    }
    return this.toSnakeCaseKeys(value);
  }

  private toSnakeCaseKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.toSnakeCaseKeys(item));
    }

    if (value === null || typeof value !== "object" || value instanceof Date) {
      return value;
    }

    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>,
    )) {
      result[this.toSnakeCase(key)] = OPAQUE_LOG_FIELDS.has(key)
        ? nested
        : this.toSnakeCaseKeys(nested);
    }

    return result;
  }

  private toSnakeCase(key: string): string {
    return key
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/-/g, "_")
      .toLowerCase();
  }

  protected formatTimestamp(timestamp: Date): string {
    return timestamp.toISOString();
  }

  protected colorize(text: string, color: keyof typeof COLORS): string {
    if (!this.options.colors) return text;
    return `${COLORS[color]}${text}${COLORS.reset}`;
  }

  protected getColorForLevel(level: string | number): keyof typeof COLORS {
    if (typeof level === "string") {
      return this.getColorForStringLevel(level);
    }
    return this.getColorForNumericLevel(level);
  }

  private getColorForStringLevel(level: string): keyof typeof COLORS {
    const colorMap: Record<string, keyof typeof COLORS> = {
      error: "red",
      warn: "yellow",
      info: "green",
      debug: "blue",
      verbose: "magenta",
    };

    return colorMap[level] || "gray";
  }

  private getColorForNumericLevel(level: number): keyof typeof COLORS {
    if (level >= 50) return "red";
    if (level >= 40) return "yellow";
    if (level >= 30) return "green";
    return "blue";
  }
}
