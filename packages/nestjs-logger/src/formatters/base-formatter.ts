import { ILogFormatter } from "../contracts";
import { LogEntry, HttpRequestLogEntry, FormatterOptions } from "../types";
import { COLORS } from "../constants";

export abstract class BaseFormatter implements ILogFormatter {
  constructor(protected readonly options: FormatterOptions) {}

  abstract format(entry: LogEntry): string;
  abstract formatHttpRequest(entry: HttpRequestLogEntry): string;

  protected formatTimestamp(timestamp: Date): string {
    return timestamp.toISOString();
  }

  protected colorize(text: string, color: keyof typeof COLORS): string {
    if (!this.options.colors) return text;
    return `${COLORS[color]}${text}${COLORS.reset}`;
  }

  protected getColorForLevel(level: string | number): keyof typeof COLORS {
    if (typeof level === "string") {
      switch (level) {
        case "error":
          return "red";
        case "warn":
          return "yellow";
        case "info":
          return "green";
        case "debug":
          return "blue";
        case "verbose":
          return "magenta";
        default:
          return "gray";
      }
    }

    // Для числовых уровней (Pino)
    if (level >= 50) return "red";
    if (level >= 40) return "yellow";
    if (level >= 30) return "green";
    return "blue";
  }
}
