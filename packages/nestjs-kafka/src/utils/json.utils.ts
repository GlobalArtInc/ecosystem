import * as simdjson from "simdjson";

/** @internal */
export function serializeJson(data: unknown): Buffer | undefined {
  if (data == null) return undefined;
  return Buffer.from(typeof data === "string" ? data : JSON.stringify(data));
}

export function deserializeJson<T = unknown>(data?: string | Buffer): T | undefined {
  if (data == null) return undefined;
  const str = Buffer.isBuffer(data) ? data.toString() : data;
  try {
    return simdjson.parse(str) as T;
  } catch {
    return str as unknown as T;
  }
}
