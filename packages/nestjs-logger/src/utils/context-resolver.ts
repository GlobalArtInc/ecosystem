import { Injectable } from "@nestjs/common";
import { IContextResolver } from "../contracts";

@Injectable()
export class ContextResolver implements IContextResolver {
  resolve(): string {
    const stack = new Error().stack;
    if (!stack) return "Unknown";

    const lines = stack.split("\n");

    for (let i = 3; i < lines.length; i++) {
      const line = lines[i].trim();

      if (this.shouldSkipLine(line)) continue;

      const className = this.extractClassName(line);
      if (className) return className;
    }

    return "Unknown";
  }

  private shouldSkipLine(line: string): boolean {
    const skipPatterns = [
      "ContextResolver",
      "LoggerService",
      "Object.writeLog",
      "Object.log",
      "Object.error",
      "Object.warn",
      "Object.debug",
      "Object.verbose",
      "at async",
      "at processTicksAndRejections",
    ];

    return skipPatterns.some((pattern) => line.includes(pattern));
  }

  private extractClassName(line: string): string | null {
    // Пытаемся найти имя класса в различных форматах
    const patterns = [
      /at\s+(\w+)\./, // at ClassName.method
      /at\s+.*\.(\w+)\s+\(/, // at path.ClassName (
      /(\w+)\..*\s+\(/, // ClassName.method (
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1] && this.isValidClassName(match[1])) {
        return match[1];
      }
    }

    return null;
  }

  private isValidClassName(name: string): boolean {
    // Проверяем, что это валидное имя класса (начинается с заглавной буквы)
    return (
      /^[A-Z][a-zA-Z0-9]*$/.test(name) &&
      name !== "Object" &&
      name !== "Function" &&
      name !== "AsyncFunction"
    );
  }
}
