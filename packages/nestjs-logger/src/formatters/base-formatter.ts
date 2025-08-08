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
