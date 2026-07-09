import { Injectable, PipeTransform } from "@nestjs/common";

function toCamelCase(key: string): string {
  return key.replace(/[_-]+(.)?/g, (_, char: string | undefined) => (char ? char.toUpperCase() : ""));
}

@Injectable()
export class CamelizeTransformPipe implements PipeTransform<unknown, unknown> {
  transform(value: unknown): unknown {
    return this.camelizeKeys(value);
  }

  private camelizeKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.camelizeKeys(item));
    }

    if (value === null || typeof value !== "object" || value instanceof Date || ArrayBuffer.isView(value)) {
      return value;
    }

    return Object.keys(value as Record<string, unknown>).reduce(
      (acc, key) => {
        acc[toCamelCase(key)] = this.camelizeKeys((value as Record<string, unknown>)[key]);
        return acc;
      },
      {} as Record<string, unknown>,
    );
  }
}