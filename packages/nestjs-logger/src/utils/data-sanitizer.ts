import { Injectable } from "@nestjs/common";
import { IDataSanitizer } from "../contracts";

@Injectable()
export class DataSanitizer implements IDataSanitizer {
  private readonly redactedValue = "[REDACTED]";

  constructor(private readonly sensitiveFields: readonly string[]) {}

  sanitize(data: unknown): unknown {
    if (data === null || data === undefined) return data;

    if (
      typeof data === "string" ||
      typeof data === "number" ||
      typeof data === "boolean"
    ) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    if (typeof data === "object") {
      return this.sanitizeObject(data as Record<string, unknown>);
    }

    return data;
  }

  private sanitizeObject(
    obj: Record<string, unknown>
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = this.redactedValue;
      } else {
        sanitized[key] = this.sanitize(value);
      }
    }

    return sanitized;
  }

  private isSensitiveField(fieldName: string): boolean {
    const lowerFieldName = fieldName.toLowerCase();
    return this.sensitiveFields.some((sensitive) =>
      lowerFieldName.includes(sensitive.toLowerCase())
    );
  }
}
