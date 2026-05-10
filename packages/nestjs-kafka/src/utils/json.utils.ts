/** Serializes a value to a JSON string; passes strings through unchanged. */
export function serializeJson(data: unknown): string {
  if (data == null) return "null";
  if (typeof data === "string") return data;
  return JSON.stringify(data);
}

/** Deserializes a Buffer or JSON string; returns the raw string if JSON.parse fails. */
export function deserializeJson<T = unknown>(data?: Buffer | string | null): T | undefined {
  if (data == null) return undefined;
  const str = Buffer.isBuffer(data) ? data.toString("utf8") : data;
  try {
    return JSON.parse(str) as T;
  } catch {
    return str as unknown as T;
  }
}
