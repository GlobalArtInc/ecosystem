import * as simdjson from "simdjson";

export function serializeJson(data: unknown): Buffer | null {
  if (data === undefined || data === null) return null;
  if (typeof data === "string") return Buffer.from(data);
  return Buffer.from(JSON.stringify(data));
}

export function deserializeJson<T = any>(
  data?: string | Buffer,
): T | undefined {
  try {
    if (!Buffer.isBuffer(data)) {
      return undefined;
    }

    return simdjson.parse(data.toString()) as T;
  } catch {
    return data as unknown as T;
  }
}
